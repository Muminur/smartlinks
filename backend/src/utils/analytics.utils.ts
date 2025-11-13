import * as crypto from 'crypto';
import { UAParser } from 'ua-parser-js';
import * as geoip from 'geoip-lite';
import { Request } from 'express';

/**
 * Parse User-Agent string to extract device, OS, and browser information
 * @param userAgent - User-Agent string from request headers
 * @returns Parsed device, OS, and browser data
 */
export const parseUserAgent = (userAgent: string) => {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  // Determine device type
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (result.device.type === 'mobile') {
    deviceType = 'mobile';
  } else if (result.device.type === 'tablet') {
    deviceType = 'tablet';
  }

  return {
    device: {
      type: deviceType,
      brand: result.device.vendor || null,
      model: result.device.model || null,
    },
    os: {
      name: result.os.name || null,
      version: result.os.version || null,
    },
    browser: {
      name: result.browser.name || null,
      version: result.browser.version || null,
    },
  };
};

/**
 * Hash IP address for privacy compliance (GDPR)
 * Uses SHA-256 with a secret salt for one-way hashing
 * @param ip - IP address to hash
 * @returns Hashed IP address (first 16 characters)
 */
export const hashIp = (ip: string): string => {
  const secret = process.env.IP_HASH_SECRET || 'default-secret-change-in-production';

  // Hash the IP with secret salt
  const hash = crypto
    .createHash('sha256')
    .update(ip + secret)
    .digest('hex');

  // Return first 16 characters for space efficiency while maintaining uniqueness
  return hash.substring(0, 16);
};

/**
 * Categorize referrer URL into types (direct, search, social, email, other)
 * @param referrerUrl - Referrer URL from request headers
 * @returns Referrer type and domain information
 */
export const parseReferrer = (referrerUrl?: string) => {
  if (!referrerUrl || referrerUrl === '') {
    return {
      url: null,
      domain: null,
      type: 'direct' as const,
    };
  }

  try {
    const url = new URL(referrerUrl);
    const domain = url.hostname.toLowerCase();

    // Search engines
    const searchEngines = [
      'google.com',
      'bing.com',
      'yahoo.com',
      'duckduckgo.com',
      'baidu.com',
      'yandex.com',
      'ask.com',
      'aol.com',
    ];

    // Social media platforms
    const socialPlatforms = [
      'facebook.com',
      'twitter.com',
      'x.com',
      'instagram.com',
      'linkedin.com',
      'pinterest.com',
      'reddit.com',
      'tumblr.com',
      'tiktok.com',
      'snapchat.com',
      'youtube.com',
      'vimeo.com',
      'whatsapp.com',
      'telegram.org',
      't.me',
      'discord.com',
      'slack.com',
    ];

    // Email clients
    const emailClients = [
      'mail.google.com',
      'outlook.live.com',
      'mail.yahoo.com',
      'mail.aol.com',
    ];

    // Check if referrer matches known patterns
    if (searchEngines.some((engine) => domain.includes(engine))) {
      return {
        url: referrerUrl,
        domain,
        type: 'search' as const,
      };
    }

    if (socialPlatforms.some((platform) => domain.includes(platform))) {
      return {
        url: referrerUrl,
        domain,
        type: 'social' as const,
      };
    }

    if (emailClients.some((client) => domain.includes(client))) {
      return {
        url: referrerUrl,
        domain,
        type: 'email' as const,
      };
    }

    // Default to 'other' for unknown referrers
    return {
      url: referrerUrl,
      domain,
      type: 'other' as const,
    };
  } catch {
    // Invalid URL format, treat as direct
    return {
      url: null,
      domain: null,
      type: 'direct' as const,
    };
  }
};

/**
 * Extract UTM parameters from URL query string
 * UTM parameters are used for campaign tracking
 * @param req - Express request object
 * @returns UTM parameters object
 */
export const extractUtmParams = (req: Request) => {
  const { utm_source, utm_medium, utm_campaign, utm_term, utm_content } = req.query;

  return {
    source: (utm_source as string) || null,
    medium: (utm_medium as string) || null,
    campaign: (utm_campaign as string) || null,
    term: (utm_term as string) || null,
    content: (utm_content as string) || null,
  };
};

/**
 * Get geolocation data from IP address
 * Uses geoip-lite for offline IP geolocation lookup
 * @param ip - IP address to lookup
 * @returns Geolocation data (country, region, city, coordinates)
 */
export const getGeolocation = (ip: string) => {
  // Skip geolocation for localhost/private IPs
  if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return {
      country: null,
      countryCode: null,
      region: null,
      city: null,
      latitude: null,
      longitude: null,
    };
  }

  const geo = geoip.lookup(ip);

  if (!geo) {
    return {
      country: null,
      countryCode: null,
      region: null,
      city: null,
      latitude: null,
      longitude: null,
    };
  }

  return {
    country: geo.country || null,
    countryCode: geo.country || null,
    region: geo.region || null,
    city: geo.city || null,
    latitude: geo.ll?.[0] || null,
    longitude: geo.ll?.[1] || null,
  };
};

/**
 * Extract real IP address from request
 * Handles proxies and load balancers (X-Forwarded-For, X-Real-IP)
 * @param req - Express request object
 * @returns Real client IP address
 */
export const getClientIp = (req: Request): string => {
  // Check X-Forwarded-For header (set by proxies/load balancers)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one (client IP)
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const clientIp = ips.split(',')[0].trim();
    return clientIp;
  }

  // Check X-Real-IP header (alternative proxy header)
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // Fallback to socket remote address
  return req.socket.remoteAddress || req.ip || 'unknown';
};

/**
 * Sanitize and validate URL before storage
 * Removes tracking parameters and ensures URL is safe
 * @param url - URL to sanitize
 * @returns Sanitized URL
 */
export const sanitizeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);

    // Remove common tracking parameters (optional)
    const trackingParams = [
      'fbclid',
      'gclid',
      'msclkid',
      'mc_eid',
      '_ga',
      '_hsenc',
      '_hsmi',
    ];

    trackingParams.forEach((param) => {
      urlObj.searchParams.delete(param);
    });

    return urlObj.toString();
  } catch {
    // If URL parsing fails, return original
    return url;
  }
};
