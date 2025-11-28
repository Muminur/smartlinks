import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * List of common bot user-agent patterns
 * Updated for 2025 with latest crawlers and bots
 */
const BOT_PATTERNS = [
  // Search engine crawlers
  'googlebot',
  'bingbot',
  'slurp', // Yahoo
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'sogou',
  'exabot',

  // Social media crawlers
  'facebookexternalhit',
  'facebookcatalog',
  'twitterbot',
  'whatsapp',
  'telegrambot',
  'discordbot',
  'slackbot',
  'linkedinbot',
  'pinterestbot',
  'redditbot',
  'instagrambot',
  'tiktokbot',

  // SEO/Analytics tools
  'ahrefsbot',
  'semrushbot',
  'mj12bot',
  'dotbot',
  'rogerbot',
  'screaming frog',
  'seobilitybot',

  // Site monitoring/uptime
  'uptimerobot',
  'pingdom',
  'statuscake',
  'site24x7',
  'newrelicpinger',

  // Feed readers
  'feedly',
  'feedburner',
  'inoreader',

  // Archiving/Screenshot services
  'archive.org_bot',
  'ia_archiver',
  'wayback',
  'screenshotlayer',

  // Security scanners
  'masscan',
  'nmap',
  'nuclei',
  'acunetix',
  'nessus',
  'qualys',

  // Generic bot patterns
  'bot',
  'crawler',
  'spider',
  'scraper',
  'curl',
  'wget',
  'python-requests',
  'java/',
  'go-http-client',
  'node-fetch',
  'axios',
  'okhttp',
  'apache-httpclient',

  // Headless browsers (often used for scraping)
  'headlesschrome',
  'phantomjs',
  'htmlunit',
  'selenium',
  'puppeteer',
  'playwright',

  // AI/LLM crawlers (new in 2024-2025)
  'gptbot', // OpenAI
  'chatgpt-user',
  'anthropic-ai',
  'claude-web',
  'cohere-ai',
  'perplexitybot',
  'youbot',
  'meta-externalagent', // Meta AI
];

/**
 * Check if request is from a bot based on User-Agent
 * @param userAgent - User-Agent string from request
 * @returns true if bot detected, false otherwise
 */
export const isBot = (userAgent: string): boolean => {
  if (!userAgent) {
    return false;
  }

  const lowerUserAgent = userAgent.toLowerCase();

  // Check against known bot patterns
  return BOT_PATTERNS.some((pattern) => lowerUserAgent.includes(pattern));
};

/**
 * Middleware to detect and flag bot traffic
 * Adds isBot flag to request object
 */
export const detectBot = (req: Request, _res: Response, next: NextFunction): void => {
  const userAgent = req.headers['user-agent'] || '';

  // Attach bot detection result to request
  (req as unknown as Record<string, unknown>).isBot = isBot(userAgent);

  if ((req as unknown as Record<string, unknown>).isBot) {
    logger.debug(`Bot detected: ${userAgent.substring(0, 100)}`);
  }

  next();
};

/**
 * Middleware to handle bot requests differently
 * For bots, we can serve optimized responses or skip certain operations
 */
export const handleBot = (req: Request, _res: Response, next: NextFunction): void => {
  const isRequestFromBot = (req as unknown as Record<string, unknown>).isBot;

  if (isRequestFromBot) {
    // For bots, we might want to skip analytics tracking
    (req as unknown as Record<string, unknown>).skipAnalytics = true;

    logger.debug(`Handling bot request: ${req.path}`);
  }

  next();
};

/**
 * Check if request is from a trusted bot (search engines, social media)
 * Trusted bots should still see the content but might skip some tracking
 */
export const isTrustedBot = (userAgent: string): boolean => {
  if (!userAgent) {
    return false;
  }

  const lowerUserAgent = userAgent.toLowerCase();

  const trustedBots = [
    'googlebot',
    'bingbot',
    'slurp',
    'duckduckbot',
    'facebookexternalhit',
    'twitterbot',
    'linkedinbot',
    'whatsapp',
    'telegrambot',
    'slackbot',
  ];

  return trustedBots.some((bot) => lowerUserAgent.includes(bot));
};

/**
 * Check if request is from a malicious bot (scrapers, scanners)
 * These should potentially be blocked or rate-limited more aggressively
 */
export const isMaliciousBot = (userAgent: string): boolean => {
  if (!userAgent) {
    return false;
  }

  const lowerUserAgent = userAgent.toLowerCase();

  const maliciousPatterns = [
    'masscan',
    'nmap',
    'nuclei',
    'acunetix',
    'nessus',
    'qualys',
    'nikto',
    'sqlmap',
    'havij',
    'httperf',
    'bench',
  ];

  return maliciousPatterns.some((pattern) => lowerUserAgent.includes(pattern));
};

/**
 * Middleware to block malicious bots
 */
export const blockMaliciousBots = (req: Request, res: Response, next: NextFunction): void => {
  const userAgent = req.headers['user-agent'] || '';

  if (isMaliciousBot(userAgent)) {
    logger.warn(`Malicious bot blocked: ${userAgent.substring(0, 100)} from IP: ${req.ip}`);

    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied',
      },
    });
    return;
  }

  next();
};

/**
 * Enhanced bot detection with additional heuristics
 * Checks for headless browser indicators and suspicious patterns
 */
export const advancedBotDetection = (req: Request): {
  isBot: boolean;
  confidence: number;
  reasons: string[];
} => {
  const userAgent = req.headers['user-agent'] || '';
  const reasons: string[] = [];
  let confidence = 0;

  // Check 1: User-Agent based detection
  if (isBot(userAgent)) {
    reasons.push('Bot pattern in User-Agent');
    confidence += 50;
  }

  // Check 2: Missing common browser headers
  if (!req.headers.accept) {
    reasons.push('Missing Accept header');
    confidence += 10;
  }

  if (!req.headers['accept-language']) {
    reasons.push('Missing Accept-Language header');
    confidence += 10;
  }

  // Check 3: Headless browser indicators
  if (userAgent.includes('HeadlessChrome') || userAgent.includes('Chrome-Lighthouse')) {
    reasons.push('Headless browser detected');
    confidence += 30;
  }

  // Check 4: Suspicious header combinations
  if (req.headers['x-requested-with'] === 'XMLHttpRequest' && !req.headers.referer) {
    reasons.push('Suspicious AJAX request');
    confidence += 15;
  }

  // Check 5: Known automation tools
  const automationHeaders = ['selenium', 'puppeteer', 'playwright', 'webdriver'];
  const hasAutomationHeader = Object.keys(req.headers).some((key) =>
    automationHeaders.some((tool) => key.toLowerCase().includes(tool))
  );

  if (hasAutomationHeader) {
    reasons.push('Automation tool detected');
    confidence += 40;
  }

  // Check 6: Empty or generic User-Agent
  if (!userAgent || userAgent === 'Mozilla/5.0') {
    reasons.push('Empty or generic User-Agent');
    confidence += 20;
  }

  return {
    isBot: confidence >= 50,
    confidence: Math.min(confidence, 100),
    reasons,
  };
};

/**
 * Get bot information from User-Agent
 * Returns bot type and name for analytics
 */
export const getBotInfo = (userAgent: string): {
  type: 'search' | 'social' | 'seo' | 'monitor' | 'security' | 'unknown';
  name: string;
} => {
  const lowerUserAgent = userAgent.toLowerCase();

  // Search engines
  if (lowerUserAgent.includes('googlebot')) return { type: 'search', name: 'Googlebot' };
  if (lowerUserAgent.includes('bingbot')) return { type: 'search', name: 'Bingbot' };
  if (lowerUserAgent.includes('slurp')) return { type: 'search', name: 'Yahoo Slurp' };
  if (lowerUserAgent.includes('duckduckbot')) return { type: 'search', name: 'DuckDuckBot' };

  // Social media
  if (lowerUserAgent.includes('facebookexternalhit')) return { type: 'social', name: 'Facebook' };
  if (lowerUserAgent.includes('twitterbot')) return { type: 'social', name: 'Twitter' };
  if (lowerUserAgent.includes('linkedinbot')) return { type: 'social', name: 'LinkedIn' };

  // SEO tools
  if (lowerUserAgent.includes('ahrefsbot')) return { type: 'seo', name: 'Ahrefs' };
  if (lowerUserAgent.includes('semrushbot')) return { type: 'seo', name: 'SEMrush' };

  // Monitoring
  if (lowerUserAgent.includes('uptimerobot')) return { type: 'monitor', name: 'UptimeRobot' };
  if (lowerUserAgent.includes('pingdom')) return { type: 'monitor', name: 'Pingdom' };

  // Security
  if (isMaliciousBot(userAgent)) return { type: 'security', name: 'Security Scanner' };

  return { type: 'unknown', name: 'Unknown Bot' };
};

export default {
  isBot,
  detectBot,
  handleBot,
  isTrustedBot,
  isMaliciousBot,
  blockMaliciousBots,
  advancedBotDetection,
  getBotInfo,
};
