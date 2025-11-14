// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
  updatedAt: string;
}

// Link types
export interface Link {
  _id: string;
  slug: string;
  originalUrl: string;
  customSlug?: string;
  title?: string;
  description?: string;
  favicon?: string;
  clicks: number;
  uniqueClicks: number;
  userId: string;
  isActive: boolean;
  isPasswordProtected: boolean;
  password?: string;
  tags?: string[];
  expiresAt?: string;
  maxClicks?: number;
  qrCode?: string;
  utmParams?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  metadata?: {
    title?: string;
    description?: string;
    image?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateLinkData {
  originalUrl: string;
  customSlug?: string;
  title?: string;
  description?: string;
  tags?: string[];
  expiresAt?: string;
  maxClicks?: number;
  password?: string;
  generateQR?: boolean;
}

export interface UpdateLinkData {
  title?: string;
  description?: string;
  tags?: string[];
  isActive?: boolean;
  expiresAt?: string;
  maxClicks?: number;
  password?: string;
}

export interface LinkFilters {
  search?: string;
  status?: 'all' | 'active' | 'expired' | 'disabled';
  tags?: string[];
  sortBy?: 'createdAt' | 'clicks' | 'title' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Analytics types
export interface Analytics {
  totalClicks: number;
  uniqueClicks: number;
  clicksByDate: { date: string; clicks: number }[];
  clicksByCountry: { country: string; clicks: number }[];
  clicksByDevice: { device: string; clicks: number }[];
  clicksByBrowser: { browser: string; clicks: number }[];
  clicksByOS: { os: string; clicks: number }[];
  clicksByReferrer: { referrer: string; clicks: number }[];
}

export interface AnalyticsData {
  _id: string;
  linkId: string;
  timestamp: string;
  ipHash: string;
  country?: string;
  city?: string;
  region?: string;
  device: string;
  os: string;
  browser: string;
  referrer?: string;
  userAgent: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
