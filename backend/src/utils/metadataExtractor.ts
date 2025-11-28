import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from './logger';

/**
 * Metadata interface for extracted URL information
 */
export interface UrlMetadata {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

/**
 * Configuration for metadata extraction
 */
const EXTRACTOR_CONFIG = {
  timeout: 5000, // 5 seconds timeout
  maxRedirects: 5,
  maxContentLength: 5 * 1024 * 1024, // 5MB max
  userAgent: 'Mozilla/5.0 (compatible; TinyURLBot/1.0; +https://tinyurl.com)',
};

/**
 * Extract metadata from a URL using Open Graph and fallback methods
 *
 * @param url - URL to extract metadata from
 * @returns Promise<UrlMetadata> - Extracted metadata
 */
export async function extractUrlMetadata(url: string): Promise<UrlMetadata> {
  try {
    logger.debug(`Extracting metadata from: ${url}`);

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      logger.warn(`Invalid URL for metadata extraction: ${url}`);
      return {};
    }

    // Fetch the URL content
    const response = await axios.get(url, {
      timeout: EXTRACTOR_CONFIG.timeout,
      maxRedirects: EXTRACTOR_CONFIG.maxRedirects,
      maxContentLength: EXTRACTOR_CONFIG.maxContentLength,
      headers: {
        'User-Agent': EXTRACTOR_CONFIG.userAgent,
        Accept: 'text/html,application/xhtml+xml',
      },
      validateStatus: (status) => status < 400, // Accept redirects and success
    });

    // Parse HTML content
    const html = response.data;
    const $ = cheerio.load(html);

    // Extract metadata with fallbacks
    const metadata: UrlMetadata = {
      // Title: og:title > twitter:title > title tag
      title:
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        $('title').text() ||
        undefined,

      // Description: og:description > twitter:description > meta description
      description:
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="twitter:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        undefined,

      // Image: og:image > twitter:image
      image:
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        undefined,

      // Site name: og:site_name
      siteName: $('meta[property="og:site_name"]').attr('content') || undefined,

      // Favicon: link rel="icon" or link rel="shortcut icon"
      favicon:
        $('link[rel="icon"]').attr('href') ||
        $('link[rel="shortcut icon"]').attr('href') ||
        undefined,
    };

    // Clean and normalize metadata
    if (metadata.title) {
      metadata.title = cleanText(metadata.title).substring(0, 200);
    }

    if (metadata.description) {
      metadata.description = cleanText(metadata.description).substring(0, 500);
    }

    // Make relative URLs absolute
    if (metadata.image && !isAbsoluteUrl(metadata.image)) {
      metadata.image = resolveUrl(parsedUrl, metadata.image);
    }

    if (metadata.favicon && !isAbsoluteUrl(metadata.favicon)) {
      metadata.favicon = resolveUrl(parsedUrl, metadata.favicon);
    }

    logger.debug(`Metadata extracted successfully for: ${url}`, metadata);
    return metadata;
  } catch (error) {
    // Handle errors gracefully - metadata extraction is not critical
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        logger.warn(`Timeout while extracting metadata from: ${url}`);
      } else if (error.response) {
        logger.warn(
          `HTTP ${error.response.status} while extracting metadata from: ${url}`
        );
      } else if (error.request) {
        logger.warn(`Network error while extracting metadata from: ${url}`);
      } else {
        logger.warn(`Error extracting metadata from: ${url}`, error.message);
      }
    } else {
      logger.warn(`Unexpected error extracting metadata from: ${url}`, error);
    }

    // Return empty metadata on error
    return {};
  }
}

/**
 * Extract metadata with caching support
 * This version checks Redis cache before fetching
 *
 * @param url - URL to extract metadata from
 * @param cacheKey - Optional cache key (defaults to URL)
 * @returns Promise<UrlMetadata> - Extracted or cached metadata
 */
export async function extractUrlMetadataWithCache(
  url: string,
  cacheKey?: string
): Promise<UrlMetadata> {
  try {
    // Import redis client dynamically to avoid circular dependencies
    const { getRedisClient } = await import('../config/redis');
    const redisClient = getRedisClient();

    const key = cacheKey || `metadata:${url}`;
    const cacheDuration = 7 * 24 * 60 * 60; // 7 days in seconds

    // Check cache first if Redis is available
    if (redisClient && redisClient.isReady) {
      const cached = await redisClient.get(key);
      if (cached) {
        logger.debug(`Metadata cache hit for: ${url}`);
        return JSON.parse(cached) as UrlMetadata;
      }
    }

    // Extract metadata
    const metadata = await extractUrlMetadata(url);

    // Cache the result if Redis is available
    if (redisClient && redisClient.isReady && Object.keys(metadata).length > 0) {
      await redisClient.setEx(key, cacheDuration, JSON.stringify(metadata));
      logger.debug(`Metadata cached for: ${url}`);
    }

    return metadata;
  } catch (error) {
    // If cache fails, fall back to direct extraction
    logger.warn('Cache error, falling back to direct extraction:', error);
    return extractUrlMetadata(url);
  }
}

/**
 * Clean text by removing extra whitespace and normalizing
 *
 * @param text - Text to clean
 * @returns string - Cleaned text
 */
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, ' ') // Replace newlines with space
    .trim();
}

/**
 * Check if a URL is absolute
 *
 * @param url - URL to check
 * @returns boolean - True if URL is absolute
 */
function isAbsoluteUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve a relative URL against a base URL
 *
 * @param baseUrl - Base URL
 * @param relativeUrl - Relative URL to resolve
 * @returns string - Absolute URL
 */
function resolveUrl(baseUrl: URL, relativeUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl.origin).toString();
  } catch {
    // If resolution fails, return original
    return relativeUrl;
  }
}

/**
 * Batch extract metadata for multiple URLs
 * Useful for processing multiple links at once
 *
 * @param urls - Array of URLs to extract metadata from
 * @param maxConcurrent - Maximum concurrent requests (default: 5)
 * @returns Promise<Map<string, UrlMetadata>> - Map of URL to metadata
 */
export async function batchExtractMetadata(
  urls: string[],
  maxConcurrent: number = 5
): Promise<Map<string, UrlMetadata>> {
  const results = new Map<string, UrlMetadata>();
  const chunks: string[][] = [];

  // Split URLs into chunks
  for (let i = 0; i < urls.length; i += maxConcurrent) {
    chunks.push(urls.slice(i, i + maxConcurrent));
  }

  // Process chunks sequentially
  for (const chunk of chunks) {
    const promises = chunk.map(async (url) => {
      const metadata = await extractUrlMetadataWithCache(url);
      return { url, metadata };
    });

    const chunkResults = await Promise.all(promises);

    chunkResults.forEach(({ url, metadata }) => {
      results.set(url, metadata);
    });
  }

  logger.info(`Batch metadata extraction completed for ${urls.length} URLs`);
  return results;
}

/**
 * Validate if a URL is safe to fetch
 * Prevents SSRF and other security issues
 *
 * @param url - URL to validate
 * @returns boolean - True if URL is safe to fetch
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    // Only allow HTTP and HTTPS
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }

    // Block localhost and private IP ranges
    const hostname = parsedUrl.hostname.toLowerCase();

    // Block localhost
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1'
    ) {
      return false;
    }

    // Block private IP ranges (basic check)
    if (
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)
    ) {
      return false;
    }

    // Block link-local addresses
    if (hostname.startsWith('169.254.')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
