/**
 * Application Constants
 */

export const APP_NAME = 'ShortLinks';
export const APP_DESCRIPTION = 'Professional URL shortening service';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh-token',
    VERIFY_EMAIL: '/auth/verify-email',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    CURRENT_USER: '/auth/me',
    CHANGE_PASSWORD: '/auth/change-password',
  },
  // Link endpoints
  LINKS: {
    CREATE: '/links',
    LIST: '/links',
    GET: (id: string) => `/links/${id}`,
    UPDATE: (id: string) => `/links/${id}`,
    DELETE: (id: string) => `/links/${id}`,
    BULK_CREATE: '/links/bulk',
    BULK_DELETE: '/links/bulk',
  },
  // Analytics endpoints
  ANALYTICS: {
    SUMMARY: (linkId: string) => `/analytics/${linkId}/summary`,
    GEOGRAPHIC: (linkId: string) => `/analytics/${linkId}/geographic`,
    DEVICES: (linkId: string) => `/analytics/${linkId}/devices`,
    BROWSERS: (linkId: string) => `/analytics/${linkId}/browsers`,
    OS: (linkId: string) => `/analytics/${linkId}/os`,
    REFERRERS: (linkId: string) => `/analytics/${linkId}/referrers`,
    TIME_SERIES: (linkId: string) => `/analytics/${linkId}/time-series`,
    TRENDING: '/analytics/trending',
    PERFORMANCE: (linkId: string) => `/analytics/${linkId}/performance`,
    EXPORT: (linkId: string) => `/analytics/${linkId}/export`,
    COMPARE: '/analytics/compare',
    CUSTOM: '/analytics/custom-report',
  },
  // Domain endpoints
  DOMAINS: {
    LIST: '/domains',
    CREATE: '/domains',
    GET: (id: string) => `/domains/${id}`,
    UPDATE: (id: string) => `/domains/${id}`,
    DELETE: (id: string) => `/domains/${id}`,
    VERIFY: (id: string) => `/domains/${id}/verify`,
  },
  // Payment endpoints
  PAYMENTS: {
    CHECKOUT: '/payments/checkout',
    WEBHOOK: '/payments/webhook',
    HISTORY: '/payments/history',
    INVOICE: (id: string) => `/payments/invoice/${id}`,
  },
} as const;

/**
 * Subscription Plans
 */
export const PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    features: {
      maxLinks: 50,
      maxClicksPerLink: 1000,
      customSlug: true,
      analytics: 'basic',
      customDomain: false,
      apiAccess: false,
      teamMembers: 1,
      linkExpiration: false,
      passwordProtection: false,
      qrCodes: true,
    },
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 9,
    interval: 'month',
    features: {
      maxLinks: 1000,
      maxClicksPerLink: 100000,
      customSlug: true,
      analytics: 'advanced',
      customDomain: true,
      apiAccess: true,
      teamMembers: 5,
      linkExpiration: true,
      passwordProtection: true,
      qrCodes: true,
    },
  },
  BUSINESS: {
    id: 'business',
    name: 'Business',
    price: 29,
    interval: 'month',
    features: {
      maxLinks: 10000,
      maxClicksPerLink: 1000000,
      customSlug: true,
      analytics: 'advanced',
      customDomain: true,
      apiAccess: true,
      teamMembers: 20,
      linkExpiration: true,
      passwordProtection: true,
      qrCodes: true,
    },
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    interval: 'month',
    features: {
      maxLinks: -1, // Unlimited
      maxClicksPerLink: -1, // Unlimited
      customSlug: true,
      analytics: 'advanced',
      customDomain: true,
      apiAccess: true,
      teamMembers: -1, // Unlimited
      linkExpiration: true,
      passwordProtection: true,
      qrCodes: true,
    },
  },
} as const;

/**
 * Local Storage Keys
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth-token',
  REFRESH_TOKEN: 'refresh-token',
  USER: 'user',
  THEME: 'theme',
  SIDEBAR_COLLAPSED: 'sidebar-collapsed',
} as const;

/**
 * Validation Rules
 */
export const VALIDATION = {
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    PATTERN: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  },
  SLUG: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z0-9-_]+$/,
  },
  URL: {
    MAX_LENGTH: 2048,
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
} as const;

/**
 * Pagination
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

/**
 * Date Ranges
 */
export const DATE_RANGES = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  LAST_7_DAYS: 'last_7_days',
  LAST_30_DAYS: 'last_30_days',
  LAST_90_DAYS: 'last_90_days',
  THIS_MONTH: 'this_month',
  LAST_MONTH: 'last_month',
  CUSTOM: 'custom',
} as const;

/**
 * Analytics Metrics
 */
export const ANALYTICS_METRICS = {
  CLICKS: 'clicks',
  UNIQUE_CLICKS: 'unique_clicks',
  CTR: 'ctr',
  BOUNCE_RATE: 'bounce_rate',
  AVG_SESSION_DURATION: 'avg_session_duration',
} as const;

/**
 * Chart Colors (Dark mode compatible)
 */
export const CHART_COLORS = {
  primary: '#3b82f6',    // blue
  success: '#10b981',    // green
  warning: '#f59e0b',    // amber
  danger: '#ef4444',     // red
  violet: '#8b5cf6',     // violet
  pink: '#ec4899',       // pink
  cyan: '#06b6d4',       // cyan
  lime: '#84cc16',       // lime
  indigo: '#6366f1',     // indigo
  emerald: '#059669',    // emerald
  orange: '#f97316',     // orange
  purple: '#9333ea',     // purple
} as const;

export const CHART_COLORS_ARRAY = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#6366f1', '#059669', '#f97316', '#9333ea',
] as const;

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  GENERIC: 'An unexpected error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  SERVER: 'Server error. Please try again later.',
} as const;

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  LINK_CREATED: 'Link created successfully!',
  LINK_UPDATED: 'Link updated successfully!',
  LINK_DELETED: 'Link deleted successfully!',
  COPIED: 'Copied to clipboard!',
  SAVED: 'Changes saved successfully!',
} as const;

/**
 * Regex Patterns
 */
export const REGEX = {
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  SLUG: /^[a-zA-Z0-9-_]+$/,
  DOMAIN: /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/,
} as const;

/**
 * Device Types
 */
export const DEVICE_TYPES = {
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
  BOT: 'bot',
  UNKNOWN: 'unknown',
} as const;

/**
 * Browser Types
 */
export const BROWSER_TYPES = {
  CHROME: 'chrome',
  FIREFOX: 'firefox',
  SAFARI: 'safari',
  EDGE: 'edge',
  OPERA: 'opera',
  IE: 'ie',
  OTHER: 'other',
} as const;

/**
 * Operating Systems
 */
export const OS_TYPES = {
  WINDOWS: 'windows',
  MAC: 'mac',
  LINUX: 'linux',
  ANDROID: 'android',
  IOS: 'ios',
  OTHER: 'other',
} as const;

/**
 * Link Status
 */
export const LINK_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  DISABLED: 'disabled',
} as const;

/**
 * Export Formats
 */
export const EXPORT_FORMATS = {
  CSV: 'csv',
  JSON: 'json',
  PDF: 'pdf',
} as const;

/**
 * Time Intervals
 */
export const TIME_INTERVALS = {
  HOURLY: 'hourly',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
} as const;
