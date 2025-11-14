import { z } from 'zod';

/**
 * Validation schema for creating a new link
 */
export const createLinkSchema = z.object({
  originalUrl: z
    .string()
    .min(1, 'URL is required')
    .url('Please enter a valid URL')
    .refine(
      url => {
        try {
          const urlObj = new URL(url);
          return ['http:', 'https:'].includes(urlObj.protocol);
        } catch {
          return false;
        }
      },
      { message: 'URL must use HTTP or HTTPS protocol' }
    ),
  customSlug: z
    .string()
    .min(3, 'Custom slug must be at least 3 characters')
    .max(50, 'Custom slug must be less than 50 characters')
    .regex(
      /^[a-zA-Z0-9-_]+$/,
      'Custom slug can only contain letters, numbers, hyphens, and underscores'
    )
    .optional()
    .or(z.literal('')),
  title: z
    .string()
    .max(200, 'Title must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  tags: z
    .array(z.string())
    .max(10, 'Maximum 10 tags allowed')
    .optional()
    .default([]),
  expiresAt: z
    .string()
    .datetime({ message: 'Invalid date format' })
    .refine(date => new Date(date) > new Date(), {
      message: 'Expiration date must be in the future',
    })
    .optional()
    .or(z.literal('')),
  maxClicks: z
    .number()
    .int('Must be a whole number')
    .positive('Must be greater than 0')
    .max(1000000, 'Maximum 1,000,000 clicks allowed')
    .optional()
    .or(z.nan()),
  password: z
    .string()
    .min(4, 'Password must be at least 4 characters')
    .max(50, 'Password must be less than 50 characters')
    .optional()
    .or(z.literal('')),
  generateQR: z.boolean().optional().default(false),
});

export type CreateLinkFormData = z.infer<typeof createLinkSchema>;

/**
 * Validation schema for updating a link
 */
export const updateLinkSchema = z.object({
  title: z
    .string()
    .max(200, 'Title must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  tags: z
    .array(z.string())
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
  isActive: z.boolean().optional(),
  expiresAt: z
    .string()
    .datetime({ message: 'Invalid date format' })
    .optional()
    .or(z.literal('')),
  maxClicks: z
    .number()
    .int('Must be a whole number')
    .positive('Must be greater than 0')
    .max(1000000, 'Maximum 1,000,000 clicks allowed')
    .optional()
    .or(z.nan()),
  password: z
    .string()
    .min(4, 'Password must be at least 4 characters')
    .max(50, 'Password must be less than 50 characters')
    .optional()
    .or(z.literal('')),
});

export type UpdateLinkFormData = z.infer<typeof updateLinkSchema>;

/**
 * Validation schema for custom slug availability check
 */
export const slugCheckSchema = z.object({
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be less than 50 characters')
    .regex(
      /^[a-zA-Z0-9-_]+$/,
      'Slug can only contain letters, numbers, hyphens, and underscores'
    ),
});

export type SlugCheckData = z.infer<typeof slugCheckSchema>;

/**
 * Validation schema for bulk link operations
 */
export const bulkDeleteSchema = z.object({
  linkIds: z
    .array(z.string())
    .min(1, 'At least one link must be selected')
    .max(100, 'Maximum 100 links can be deleted at once'),
});

export type BulkDeleteData = z.infer<typeof bulkDeleteSchema>;

/**
 * Validation schema for link filters
 */
export const linkFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['all', 'active', 'expired', 'disabled']).optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z
    .enum(['createdAt', 'clicks', 'title', 'updatedAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z
    .number()
    .int()
    .positive()
    .max(100, 'Maximum 100 items per page')
    .optional()
    .default(10),
});

export type LinkFiltersData = z.infer<typeof linkFiltersSchema>;

/**
 * Validation schema for CSV import
 */
export const csvImportSchema = z.object({
  file: z
    .instanceof(File)
    .refine(file => file.size <= 5 * 1024 * 1024, {
      message: 'File size must be less than 5MB',
    })
    .refine(file => file.type === 'text/csv' || file.name.endsWith('.csv'), {
      message: 'File must be a CSV',
    }),
});

export type CSVImportData = z.infer<typeof csvImportSchema>;

/**
 * Validation schema for link export options
 */
export const exportOptionsSchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  fields: z
    .array(
      z.enum([
        'slug',
        'originalUrl',
        'title',
        'description',
        'clicks',
        'uniqueClicks',
        'createdAt',
        'updatedAt',
        'isActive',
        'tags',
      ])
    )
    .min(1, 'At least one field must be selected'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type ExportOptionsData = z.infer<typeof exportOptionsSchema>;
