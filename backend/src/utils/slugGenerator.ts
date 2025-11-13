import { customAlphabet } from 'nanoid';
import Link from '../models/link.model';
import { logger } from './logger';

/**
 * Custom alphabet for slug generation
 * Using URL-safe characters: lowercase, uppercase, and digits
 * Excludes potentially confusing characters like 0/O, 1/l/I
 */
const ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Default slug length
 */
const DEFAULT_SLUG_LENGTH = 6;

/**
 * Maximum retry attempts for slug generation
 */
const MAX_RETRIES = 5;

/**
 * Generate a unique random slug using nanoid
 * Automatically retries if collision occurs (extremely rare)
 *
 * @param length - Length of the slug (default: 6)
 * @returns Promise<string> - Unique slug
 * @throws Error if unable to generate unique slug after max retries
 */
export async function generateUniqueSlug(length: number = DEFAULT_SLUG_LENGTH): Promise<string> {
  const nanoid = customAlphabet(ALPHABET, length);
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    attempts++;
    const slug = nanoid();

    try {
      // Check if slug already exists
      const existingLink = await Link.findOne({ slug });

      if (!existingLink) {
        logger.debug(`Generated unique slug: ${slug} (attempt ${attempts})`);
        return slug;
      }

      logger.warn(`Slug collision detected: ${slug} (attempt ${attempts}/${MAX_RETRIES})`);
    } catch (error) {
      logger.error('Error checking slug uniqueness:', error);
      throw new Error('Database error while generating slug');
    }
  }

  // If we've exhausted all retries, throw an error
  logger.error(`Failed to generate unique slug after ${MAX_RETRIES} attempts`);
  throw new Error('Unable to generate unique slug. Please try again.');
}

/**
 * Validate a custom slug provided by the user
 *
 * @param slug - Custom slug to validate
 * @returns boolean - True if slug is valid format
 */
export function isValidCustomSlug(slug: string): boolean {
  // Check length (3-50 characters)
  if (slug.length < 3 || slug.length > 50) {
    return false;
  }

  // Check format: lowercase alphanumeric + hyphens only
  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(slug)) {
    return false;
  }

  // Check that it doesn't start or end with hyphen
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return false;
  }

  // Check that it doesn't have consecutive hyphens
  if (slug.includes('--')) {
    return false;
  }

  return true;
}

/**
 * Check if a custom slug is available (not already in use)
 *
 * @param slug - Slug to check
 * @returns Promise<boolean> - True if slug is available
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  try {
    const existingLink = await Link.findOne({ slug: slug.toLowerCase() });
    return !existingLink;
  } catch (error) {
    logger.error('Error checking slug availability:', error);
    throw new Error('Database error while checking slug availability');
  }
}

/**
 * List of reserved slugs that cannot be used
 * These are typically system routes or common words
 */
const RESERVED_SLUGS = [
  'api',
  'admin',
  'dashboard',
  'login',
  'register',
  'logout',
  'signup',
  'signin',
  'auth',
  'user',
  'users',
  'account',
  'settings',
  'profile',
  'help',
  'support',
  'contact',
  'about',
  'terms',
  'privacy',
  'static',
  'public',
  'assets',
  'images',
  'css',
  'js',
  'favicon',
  'robots',
  'sitemap',
  'health',
  'status',
  'metrics',
  'docs',
  'documentation',
];

/**
 * Check if a slug is reserved
 *
 * @param slug - Slug to check
 * @returns boolean - True if slug is reserved
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase());
}

/**
 * Generate a slug suggestion based on URL or title
 * Useful for suggesting custom slugs to users
 *
 * @param text - URL or title to generate slug from
 * @returns string - Suggested slug
 */
export function generateSlugSuggestion(text: string): string {
  // Extract domain or use text as is
  let base = text;

  try {
    const url = new URL(text);
    // Use pathname or hostname
    base = url.pathname !== '/' ? url.pathname : url.hostname;
  } catch {
    // Not a URL, use as is
  }

  // Clean and format
  let slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .replace(/-{2,}/g, '-') // Replace multiple hyphens with single
    .substring(0, 50); // Limit length

  // If empty or too short, generate random
  if (!slug || slug.length < 3) {
    const nanoid = customAlphabet(ALPHABET, 6);
    slug = nanoid();
  }

  return slug;
}
