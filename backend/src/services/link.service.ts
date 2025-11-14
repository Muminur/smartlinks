import mongoose, { Types } from 'mongoose';
import Link, { ILinkDocument } from '../models/link.model';
import Analytics from '../models/analytics.model';
import User from '../models/user.model';
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
} from '../utils/errorHandler';
import { PaginatedResponse } from '../types';
import { generateUniqueSlug, isValidCustomSlug, isSlugAvailable, isReservedSlug } from '../utils/slugGenerator';
import { extractUrlMetadataWithCache, isSafeUrl } from '../utils/metadataExtractor';

interface GetLinksFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
  search?: string;
  tags?: string[];
  isActive?: boolean;
  domain?: string;
}

interface LinkUpdateData {
  title?: string;
  description?: string;
  tags?: string[];
  expiresAt?: Date | null;
  maxClicks?: number | null;
  isActive?: boolean;
  metadata?: {
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
  };
}

interface AnalyticsSummary {
  totalClicks: number;
  uniqueVisitors: number;
  topCountries: Array<{ country: string; count: number }>;
  topDevices: Array<{ device: string; count: number }>;
  topBrowsers: Array<{ browser: string; count: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  clicksByDate: Array<{ date: string; count: number }>;
}

export interface CreateLinkData {
  originalUrl: string;
  customSlug?: string;
  title?: string;
  description?: string;
  tags?: string[];
  expiresAt?: Date;
  maxClicks?: number;
  password?: string;
  domain?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
}

interface PlanLimits {
  linksLimit: number;
  clicksLimit: number;
  customDomain: boolean;
  customSlug: boolean;
  passwordProtection: boolean;
  analytics: boolean;
  qrCode: boolean;
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    linksLimit: 50,
    clicksLimit: 1000,
    customDomain: false,
    customSlug: false,
    passwordProtection: false,
    analytics: false,
    qrCode: false,
  },
  pro: {
    linksLimit: 1000,
    clicksLimit: 50000,
    customDomain: false,
    customSlug: true,
    passwordProtection: true,
    analytics: true,
    qrCode: true,
  },
  business: {
    linksLimit: 10000,
    clicksLimit: 500000,
    customDomain: true,
    customSlug: true,
    passwordProtection: true,
    analytics: true,
    qrCode: true,
  },
  enterprise: {
    linksLimit: Infinity,
    clicksLimit: Infinity,
    customDomain: true,
    customSlug: true,
    passwordProtection: true,
    analytics: true,
    qrCode: true,
  },
};

class LinkService {
  private readonly CACHE_PREFIX = 'link:';
  private readonly CACHE_TTL = 3600; // 1 hour

  private getPlanLimits(planType: string): PlanLimits {
    return PLAN_LIMITS[planType] || PLAN_LIMITS.free;
  }

  async checkQuota(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      const limits = this.getPlanLimits(user.plan.type);

      if (user.quota.linksCreated >= limits.linksLimit) {
        return {
          allowed: false,
          reason: `You have reached your plan limit of ${limits.linksLimit} links. Please upgrade your plan to create more links.`,
        };
      }

      if (user.quota.clicksTracked >= limits.clicksLimit) {
        return {
          allowed: false,
          reason: `You have reached your plan limit of ${limits.clicksLimit} clicks. Please upgrade your plan or wait for quota reset.`,
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error checking quota:', error);
      throw error;
    }
  }

  async checkDuplicateUrl(userId: string, originalUrl: string): Promise<ILinkDocument | null> {
    try {
      const existingLink = await Link.findOne({
        userId: new Types.ObjectId(userId),
        originalUrl,
        isActive: true,
      });

      return existingLink;
    } catch (error) {
      logger.error('Error checking duplicate URL:', error);
      throw error;
    }
  }

  validateCustomSlug(slug: string, userPlanType: string): void {
    const limits = this.getPlanLimits(userPlanType);

    if (!limits.customSlug) {
      throw new ForbiddenError('Custom slugs are not available on your plan. Please upgrade to Pro or higher.');
    }

    if (!isValidCustomSlug(slug)) {
      throw new ValidationError(
        'Invalid slug format. Slug must be 3-50 characters long, lowercase alphanumeric with hyphens only.'
      );
    }

    if (isReservedSlug(slug)) {
      throw new ValidationError('This slug is reserved and cannot be used.');
    }
  }

  async generateSlug(customSlug: string | undefined, userPlanType: string): Promise<string> {
    try {
      if (customSlug) {
        this.validateCustomSlug(customSlug, userPlanType);

        const available = await isSlugAvailable(customSlug);
        if (!available) {
          throw new ConflictError('This slug is already in use. Please choose a different one.');
        }

        return customSlug.toLowerCase();
      }

      return await generateUniqueSlug();
    } catch (error) {
      logger.error('Error generating slug:', error);
      throw error;
    }
  }

  async extractMetadata(url: string): Promise<{ ogTitle?: string; ogDescription?: string; ogImage?: string }> {
    try {
      if (!isSafeUrl(url)) {
        logger.warn(`Unsafe URL detected, skipping metadata extraction: ${url}`);
        return {};
      }

      const metadata = await extractUrlMetadataWithCache(url);

      return {
        ogTitle: metadata.title,
        ogDescription: metadata.description,
        ogImage: metadata.image,
      };
    } catch (error) {
      logger.warn('Metadata extraction failed:', error);
      return {};
    }
  }

  async shortenUrl(userId: string | null, linkData: CreateLinkData): Promise<ILinkDocument> {
    try {
      // Handle anonymous users (userId is null for public endpoint)
      let user = null;
      let userPlanType = 'free';

      if (userId) {
        user = await User.findById(userId);
        if (!user) {
          throw new NotFoundError('User not found');
        }

        const quotaCheck = await this.checkQuota(userId);
        if (!quotaCheck.allowed) {
          throw new ForbiddenError(quotaCheck.reason || 'Quota exceeded');
        }

        userPlanType = user.plan.type;
      }

      try {
        new URL(linkData.originalUrl);
      } catch {
        throw new ValidationError('Invalid URL format. Please provide a valid HTTP or HTTPS URL.');
      }

      // Check for duplicates only for authenticated users
      if (userId) {
        const duplicate = await this.checkDuplicateUrl(userId, linkData.originalUrl);
        if (duplicate) {
          logger.info(`Returning existing link for URL: ${linkData.originalUrl}`);
          return duplicate;
        }
      }

      const limits = this.getPlanLimits(userPlanType);

      if (linkData.password && !limits.passwordProtection) {
        throw new ForbiddenError('Password protection is not available on your plan. Please upgrade to Pro or higher.');
      }

      if (linkData.domain && linkData.domain !== 'short.link' && !limits.customDomain) {
        throw new ForbiddenError('Custom domains are not available on your plan. Please upgrade to Business or higher.');
      }

      const slug = await this.generateSlug(linkData.customSlug, userPlanType);
      const metadata = await this.extractMetadata(linkData.originalUrl);
      const domain = linkData.domain || process.env.SHORT_DOMAIN || process.env.FRONTEND_URL?.replace(/^https?:\/\//, '') || 'localhost:5000';
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      const shortUrl = `${protocol}://${domain}/${slug}`;

      const link = new Link({
        slug,
        originalUrl: linkData.originalUrl,
        shortUrl,
        userId: userId ? new Types.ObjectId(userId) : undefined,
        domain,
        title: linkData.title,
        description: linkData.description,
        tags: linkData.tags || [],
        metadata,
        password: linkData.password,
        expiresAt: linkData.expiresAt,
        maxClicks: linkData.maxClicks,
        utm: linkData.utm,
        clicks: 0,
        isActive: true,
      });

      await link.save();

      // Update user quota only for authenticated users
      if (user) {
        user.quota.linksCreated += 1;
        await user.save();
      }

      const redis = getRedisClient();
      if (redis && redis.isReady) {
        const cacheKey = `link:slug:${slug}`;
        const cacheData = JSON.stringify({
          originalUrl: link.originalUrl,
          hasPassword: !!link.password,
          expiresAt: link.expiresAt,
          maxClicks: link.maxClicks,
          clicks: link.clicks,
        });
        await redis.setEx(cacheKey, 24 * 60 * 60, cacheData);
      }

      logger.info(`Link created: ${shortUrl} -> ${linkData.originalUrl} by user ${userId}`);

      return link;
    } catch (error) {
      logger.error('Error shortening URL:', error);
      throw error;
    }
  }

  async getLinkBySlug(slug: string): Promise<ILinkDocument | null> {
    try {
      const redis = getRedisClient();
      if (redis && redis.isReady) {
        const cacheKey = `link:slug:${slug}`;
        const cached = await redis.get(cacheKey);

        if (cached) {
          const link = await Link.findOne({ slug });
          return link;
        }
      }

      const link = await Link.findOne({ slug });

      if (link && redis && redis.isReady) {
        const cacheKey = `link:slug:${slug}`;
        const cacheData = JSON.stringify({
          originalUrl: link.originalUrl,
          hasPassword: !!link.password,
          expiresAt: link.expiresAt,
          maxClicks: link.maxClicks,
          clicks: link.clicks,
        });
        await redis.setEx(cacheKey, 24 * 60 * 60, cacheData);
      }

      return link;
    } catch (error) {
      logger.error('Error getting link by slug:', error);
      throw error;
    }
  }

  async getUserLinks(
    userId: string,
    filters: GetLinksFilters = {}
  ): Promise<PaginatedResponse<ILinkDocument>> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        order = 'desc',
        search = '',
        tags = [],
        isActive,
        domain,
      } = filters;

      const pageNum = Math.max(1, page);
      const limitNum = Math.min(Math.max(1, limit), 100);
      const skip = (pageNum - 1) * limitNum;

      const query: any = { userId: new Types.ObjectId(userId) };

      if (isActive !== undefined) {
        query.isActive = isActive;
      }

      if (domain) {
        query.domain = domain;
      }

      if (tags.length > 0) {
        query.tags = { $in: tags };
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { originalUrl: { $regex: search, $options: 'i' } },
          { slug: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      const sortOrder = order === 'asc' ? 1 : -1;
      const sortObj: any = { [sortBy]: sortOrder };

      const [links, totalItems] = await Promise.all([
        Link.find(query)
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .lean()
          .select('-password'),
        Link.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalItems / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPreviousPage = pageNum > 1;

      logger.info(`Retrieved ${links.length} links for user ${userId}`);

      return {
        data: links as unknown as ILinkDocument[],
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems,
          itemsPerPage: limitNum,
          hasNextPage,
          hasPreviousPage,
        },
      };
    } catch (error) {
      logger.error('Get user links error:', error);
      throw error;
    }
  }

  async getLinkById(linkId: string, userId: string): Promise<ILinkDocument> {
    try {
      if (!mongoose.Types.ObjectId.isValid(linkId)) {
        throw new ValidationError('Invalid link ID format');
      }

      const cacheKey = `${this.CACHE_PREFIX}${linkId}`;
      const redis = getRedisClient();

      // Try to get from cache if Redis is available
      if (redis && redis.isReady) {
        const cachedLink = await redis.get(cacheKey);

        if (cachedLink) {
          const link = JSON.parse(cachedLink) as ILinkDocument;

          if (link.userId && link.userId.toString() !== userId) {
            throw new ForbiddenError('You do not have permission to access this link');
          }

          logger.debug(`Link ${linkId} retrieved from cache`);
          return link;
        }
      }

      const link = await Link.findById(linkId)
        .lean()
        .select('-password');

      if (!link) {
        throw new NotFoundError('Link not found');
      }

      if (link.userId && link.userId.toString() !== userId) {
        throw new ForbiddenError('You do not have permission to access this link');
      }

      // Cache if Redis is available
      if (redis && redis.isReady) {
        await redis.set(cacheKey, JSON.stringify(link), {
          EX: this.CACHE_TTL,
        });
      }

      logger.info(`Link ${linkId} retrieved for user ${userId}`);
      return link as unknown as ILinkDocument;
    } catch (error) {
      logger.error('Get link by ID error:', error);
      throw error;
    }
  }

  async updateLink(
    linkId: string,
    userId: string,
    updateData: LinkUpdateData
  ): Promise<ILinkDocument> {
    try {
      if (!mongoose.Types.ObjectId.isValid(linkId)) {
        throw new ValidationError('Invalid link ID format');
      }

      const link = await Link.findById(linkId);

      if (!link) {
        throw new NotFoundError('Link not found');
      }

      if (link.userId && link.userId.toString() !== userId) {
        throw new ForbiddenError('You do not have permission to update this link');
      }

      if (updateData.title !== undefined) link.title = updateData.title;
      if (updateData.description !== undefined) link.description = updateData.description;
      if (updateData.tags !== undefined) link.tags = updateData.tags;
      if (updateData.expiresAt !== undefined) link.expiresAt = updateData.expiresAt || undefined;
      if (updateData.maxClicks !== undefined) link.maxClicks = updateData.maxClicks || undefined;
      if (updateData.isActive !== undefined) link.isActive = updateData.isActive;
      if (updateData.metadata) {
        link.metadata = {
          ...link.metadata,
          ...updateData.metadata,
        };
      }

      await link.save();
      await this.invalidateCache(linkId);

      logger.info(`Link ${linkId} updated by user ${userId}`);
      return link;
    } catch (error) {
      logger.error('Update link error:', error);
      throw error;
    }
  }

  async deleteLink(linkId: string, userId: string, hardDelete = false): Promise<void> {
    try {
      if (!mongoose.Types.ObjectId.isValid(linkId)) {
        throw new ValidationError('Invalid link ID format');
      }

      const link = await Link.findById(linkId);

      if (!link) {
        throw new NotFoundError('Link not found');
      }

      if (link.userId && link.userId.toString() !== userId) {
        throw new ForbiddenError('You do not have permission to delete this link');
      }

      if (hardDelete) {
        await Link.findByIdAndDelete(linkId);
        await Analytics.deleteMany({ linkId: new Types.ObjectId(linkId) });
        logger.info(`Link ${linkId} hard deleted by user ${userId}`);
      } else {
        link.isActive = false;
        await link.save();
        logger.info(`Link ${linkId} soft deleted by user ${userId}`);
      }

      await this.invalidateCache(linkId);

      await User.findByIdAndUpdate(userId, {
        $inc: { 'quota.linksCreated': -1 },
      });
    } catch (error) {
      logger.error('Delete link error:', error);
      throw error;
    }
  }

  async bulkDeleteLinks(
    linkIds: string[],
    userId: string,
    hardDelete = false
  ): Promise<number> {
    try {
      const validIds = linkIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

      if (validIds.length === 0) {
        throw new ValidationError('No valid link IDs provided');
      }

      const links = await Link.find({
        _id: { $in: validIds.map((id) => new Types.ObjectId(id)) },
        userId: new Types.ObjectId(userId),
      });

      if (links.length === 0) {
        throw new NotFoundError('No links found or you do not have permission');
      }

      const linkIdsToDelete = links.map((link) => link._id);

      let deletedCount = 0;

      if (hardDelete) {
        const result = await Link.deleteMany({
          _id: { $in: linkIdsToDelete },
        });

        deletedCount = result.deletedCount || 0;

        await Analytics.deleteMany({
          linkId: { $in: linkIdsToDelete },
        });

        logger.info(`${deletedCount} links hard deleted by user ${userId}`);
      } else {
        const result = await Link.updateMany(
          { _id: { $in: linkIdsToDelete } },
          { $set: { isActive: false } }
        );

        deletedCount = result.modifiedCount || 0;

        logger.info(`${deletedCount} links soft deleted by user ${userId}`);
      }

      await Promise.all(
        linkIdsToDelete.map((id) => this.invalidateCache(String(id)))
      );

      await User.findByIdAndUpdate(userId, {
        $inc: { 'quota.linksCreated': -deletedCount },
      });

      return deletedCount;
    } catch (error) {
      logger.error('Bulk delete links error:', error);
      throw error;
    }
  }

  async toggleLinkStatus(linkId: string, userId: string): Promise<ILinkDocument> {
    try {
      if (!mongoose.Types.ObjectId.isValid(linkId)) {
        throw new ValidationError('Invalid link ID format');
      }

      const link = await Link.findById(linkId);

      if (!link) {
        throw new NotFoundError('Link not found');
      }

      if (link.userId && link.userId.toString() !== userId) {
        throw new ForbiddenError('You do not have permission to modify this link');
      }

      link.isActive = !link.isActive;
      await link.save();

      await this.invalidateCache(linkId);

      logger.info(
        `Link ${linkId} status toggled to ${link.isActive} by user ${userId}`
      );
      return link;
    } catch (error) {
      logger.error('Toggle link status error:', error);
      throw error;
    }
  }

  async getLinkAnalyticsSummary(
    linkId: string,
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AnalyticsSummary> {
    try {
      if (!mongoose.Types.ObjectId.isValid(linkId)) {
        throw new ValidationError('Invalid link ID format');
      }

      const link = await Link.findById(linkId).lean();

      if (!link) {
        throw new NotFoundError('Link not found');
      }

      if (link.userId && link.userId.toString() !== userId) {
        throw new ForbiddenError('You do not have permission to view analytics for this link');
      }

      const dateQuery: any = { linkId: new Types.ObjectId(linkId) };

      if (startDate || endDate) {
        dateQuery.timestamp = {};
        if (startDate) dateQuery.timestamp.$gte = startDate;
        if (endDate) dateQuery.timestamp.$lte = endDate;
      }

      const analyticsData = await Analytics.find(dateQuery).lean();

      const totalClicks = analyticsData.length;

      const uniqueVisitors = new Set(analyticsData.map((a: any) => a.ip)).size;

      const countryCounts: Record<string, number> = {};
      analyticsData.forEach((a: any) => {
        const country = a.location?.country || 'Unknown';
        countryCounts[country] = (countryCounts[country] || 0) + 1;
      });
      const topCountries = Object.entries(countryCounts)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const deviceCounts: Record<string, number> = {};
      analyticsData.forEach((a: any) => {
        const device = a.device?.type || 'unknown';
        deviceCounts[device] = (deviceCounts[device] || 0) + 1;
      });
      const topDevices = Object.entries(deviceCounts)
        .map(([device, count]) => ({ device, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const browserCounts: Record<string, number> = {};
      analyticsData.forEach((a: any) => {
        const browser = a.browser?.name || 'Unknown';
        browserCounts[browser] = (browserCounts[browser] || 0) + 1;
      });
      const topBrowsers = Object.entries(browserCounts)
        .map(([browser, count]) => ({ browser, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const referrerCounts: Record<string, number> = {};
      analyticsData.forEach((a: any) => {
        const referrer = a.referrer?.domain || 'Direct';
        referrerCounts[referrer] = (referrerCounts[referrer] || 0) + 1;
      });
      const topReferrers = Object.entries(referrerCounts)
        .map(([referrer, count]) => ({ referrer, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const clicksByDateMap: Record<string, number> = {};
      analyticsData.forEach((a: any) => {
        const date = new Date(a.timestamp).toISOString().split('T')[0];
        clicksByDateMap[date] = (clicksByDateMap[date] || 0) + 1;
      });
      const clicksByDate = Object.entries(clicksByDateMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      logger.info(`Analytics summary generated for link ${linkId}`);

      return {
        totalClicks,
        uniqueVisitors,
        topCountries,
        topDevices,
        topBrowsers,
        topReferrers,
        clicksByDate,
      };
    } catch (error) {
      logger.error('Get link analytics summary error:', error);
      throw error;
    }
  }

  private async invalidateCache(linkId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      if (!redis) {
        return; // Skip if Redis is not available
      }
      const cacheKey = `${this.CACHE_PREFIX}${linkId}`;
      await redis.del(cacheKey);
      logger.debug(`Cache invalidated for link ${linkId}`);
    } catch (error) {
      logger.error('Cache invalidation error:', error);
    }
  }
}

export const linkService = new LinkService();
