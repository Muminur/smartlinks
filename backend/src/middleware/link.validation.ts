import Joi from 'joi';

/**
 * Validation schema for shortening a URL (creating a link)
 */
export const shortenUrlSchema = Joi.object({
  originalUrl: Joi.string()
    .trim()
    .uri({ scheme: ['http', 'https'] })
    .required()
    .messages({
      'string.uri': 'Please provide a valid HTTP or HTTPS URL',
      'any.required': 'URL is required',
    }),
  customSlug: Joi.string()
    .trim()
    .lowercase()
    .min(3)
    .max(50)
    .pattern(/^[a-z0-9-]+$/)
    .optional()
    .messages({
      'string.min': 'Custom slug must be at least 3 characters long',
      'string.max': 'Custom slug cannot exceed 50 characters',
      'string.pattern.base':
        'Custom slug can only contain lowercase letters, numbers, and hyphens',
    }),
  title: Joi.string().trim().max(200).optional().allow(''),
  description: Joi.string().trim().max(500).optional().allow(''),
  tags: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(10)
    .optional()
    .messages({
      'array.max': 'Cannot have more than 10 tags',
    }),
  expiresAt: Joi.date().iso().min('now').optional().messages({
    'date.min': 'Expiration date must be in the future',
  }),
  maxClicks: Joi.number().integer().min(1).max(1000000).optional().messages({
    'number.min': 'Maximum clicks must be at least 1',
    'number.max': 'Maximum clicks cannot exceed 1,000,000',
  }),
  password: Joi.string().min(4).max(50).optional().messages({
    'string.min': 'Password must be at least 4 characters long',
    'string.max': 'Password cannot exceed 50 characters',
  }),
  domain: Joi.string()
    .trim()
    .lowercase()
    .hostname()
    .optional()
    .default('short.link')
    .messages({
      'string.hostname': 'Please provide a valid domain name',
    }),
  utm: Joi.object({
    source: Joi.string().trim().max(100).optional(),
    medium: Joi.string().trim().max(100).optional(),
    campaign: Joi.string().trim().max(100).optional(),
  }).optional(),
});

/**
 * Validation schema for getting links (query parameters)
 */
export const getLinksSchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(20),
  sortBy: Joi.string()
    .valid('createdAt', 'updatedAt', 'clicks', 'title', 'slug')
    .optional()
    .default('createdAt'),
  order: Joi.string().valid('asc', 'desc').optional().default('desc'),
  search: Joi.string().trim().max(200).optional().allow(''),
  tags: Joi.alternatives()
    .try(
      Joi.array().items(Joi.string().trim().max(50)),
      Joi.string().trim().max(500) // Comma-separated string
    )
    .optional(),
  isActive: Joi.alternatives()
    .try(Joi.boolean(), Joi.string().valid('true', 'false', '1', '0'))
    .optional(),
  domain: Joi.string().trim().max(100).optional(),
});

/**
 * Validation schema for updating a link
 */
export const updateLinkSchema = Joi.object({
  title: Joi.string().trim().max(200).optional().allow('', null),
  description: Joi.string().trim().max(500).optional().allow('', null),
  tags: Joi.array()
    .items(Joi.string().trim().max(50))
    .max(10)
    .optional(),
  expiresAt: Joi.alternatives()
    .try(
      Joi.date().iso().min('now'),
      Joi.string().valid('null', ''),
      Joi.valid(null)
    )
    .optional(),
  maxClicks: Joi.alternatives()
    .try(
      Joi.number().integer().min(1),
      Joi.string().valid('null', ''),
      Joi.valid(null)
    )
    .optional(),
  isActive: Joi.boolean().optional(),
  metadata: Joi.object({
    ogTitle: Joi.string().trim().max(200).optional().allow('', null),
    ogDescription: Joi.string().trim().max(500).optional().allow('', null),
    ogImage: Joi.string().uri().trim().optional().allow('', null),
  }).optional(),
})
  .min(1) // At least one field must be provided
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

/**
 * Validation schema for bulk delete
 */
export const bulkDeleteSchema = Joi.object({
  linkIds: Joi.array()
    .items(Joi.string().trim().required())
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'At least one link ID must be provided',
      'array.max': 'Cannot delete more than 100 links at once',
      'any.required': 'linkIds is required',
    }),
  hard: Joi.boolean().optional().default(false),
});

/**
 * Validation schema for link ID parameter
 */
export const linkIdSchema = Joi.object({
  id: Joi.string()
    .trim()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid link ID format',
      'any.required': 'Link ID is required',
    }),
});

/**
 * Validation schema for analytics query parameters
 */
export const analyticsQuerySchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
}).messages({
  'date.min': 'endDate must be after startDate',
});
