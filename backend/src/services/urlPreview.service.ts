import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../utils/logger';

export interface UrlPreviewData {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  siteName?: string;
  url: string;
}

class UrlPreviewService {
  private readonly timeout = 10000; // 10 seconds
  private readonly maxContentLength = 5 * 1024 * 1024; // 5MB max

  /**
   * Fetch URL metadata (title, description, image, favicon)
   */
  async getUrlPreview(url: string): Promise<UrlPreviewData> {
    try {
      // Validate URL
      const parsedUrl = new URL(url);

      // Fetch the page
      const response = await axios.get(url, {
        timeout: this.timeout,
        maxContentLength: this.maxContentLength,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ShortlinksBot/1.0; +https://shortlinks.app)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        validateStatus: (status) => status < 400,
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Extract metadata
      const title = this.extractTitle($);
      const description = this.extractDescription($);
      const image = this.extractImage($, parsedUrl);
      const favicon = this.extractFavicon($, parsedUrl);
      const siteName = this.extractSiteName($);

      return {
        title,
        description,
        image,
        favicon,
        siteName,
        url,
      };
    } catch (error) {
      logger.error('URL preview fetch error:', error);

      // Return minimal data on error
      return {
        url,
        title: undefined,
        description: undefined,
        image: undefined,
        favicon: undefined,
      };
    }
  }

  /**
   * Extract page title from meta tags or title element
   */
  private extractTitle($: cheerio.CheerioAPI): string | undefined {
    // Try Open Graph title first
    const ogTitle = $('meta[property="og:title"]').attr('content');
    if (ogTitle) return this.cleanText(ogTitle);

    // Try Twitter title
    const twitterTitle = $('meta[name="twitter:title"]').attr('content');
    if (twitterTitle) return this.cleanText(twitterTitle);

    // Fall back to title element
    const titleTag = $('title').first().text();
    if (titleTag) return this.cleanText(titleTag);

    return undefined;
  }

  /**
   * Extract page description from meta tags
   */
  private extractDescription($: cheerio.CheerioAPI): string | undefined {
    // Try Open Graph description first
    const ogDesc = $('meta[property="og:description"]').attr('content');
    if (ogDesc) return this.cleanText(ogDesc);

    // Try Twitter description
    const twitterDesc = $('meta[name="twitter:description"]').attr('content');
    if (twitterDesc) return this.cleanText(twitterDesc);

    // Try standard meta description
    const metaDesc = $('meta[name="description"]').attr('content');
    if (metaDesc) return this.cleanText(metaDesc);

    return undefined;
  }

  /**
   * Extract image URL from meta tags
   */
  private extractImage($: cheerio.CheerioAPI, baseUrl: URL): string | undefined {
    // Try Open Graph image first
    let image = $('meta[property="og:image"]').attr('content');
    if (!image) {
      // Try Twitter image
      image = $('meta[name="twitter:image"]').attr('content');
    }
    if (!image) {
      // Try link image_src
      image = $('link[rel="image_src"]').attr('href');
    }

    if (image) {
      return this.resolveUrl(image, baseUrl);
    }

    return undefined;
  }

  /**
   * Extract favicon URL
   */
  private extractFavicon($: cheerio.CheerioAPI, baseUrl: URL): string | undefined {
    // Try various favicon link tags
    let favicon = $('link[rel="icon"]').attr('href');
    if (!favicon) {
      favicon = $('link[rel="shortcut icon"]').attr('href');
    }
    if (!favicon) {
      favicon = $('link[rel="apple-touch-icon"]').attr('href');
    }

    if (favicon) {
      return this.resolveUrl(favicon, baseUrl);
    }

    // Default to /favicon.ico
    return `${baseUrl.protocol}//${baseUrl.host}/favicon.ico`;
  }

  /**
   * Extract site name from meta tags
   */
  private extractSiteName($: cheerio.CheerioAPI): string | undefined {
    const ogSiteName = $('meta[property="og:site_name"]').attr('content');
    if (ogSiteName) return this.cleanText(ogSiteName);

    return undefined;
  }

  /**
   * Resolve relative URL to absolute URL
   */
  private resolveUrl(url: string, baseUrl: URL): string {
    try {
      // If already absolute, return as-is
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }

      // Handle protocol-relative URLs
      if (url.startsWith('//')) {
        return `${baseUrl.protocol}${url}`;
      }

      // Handle root-relative URLs
      if (url.startsWith('/')) {
        return `${baseUrl.protocol}//${baseUrl.host}${url}`;
      }

      // Handle relative URLs
      return new URL(url, baseUrl.href).href;
    } catch {
      return url;
    }
  }

  /**
   * Clean and truncate text
   */
  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500); // Limit to 500 chars
  }
}

export const urlPreviewService = new UrlPreviewService();
