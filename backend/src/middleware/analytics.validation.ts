import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errorHandler';
import { logger } from '../utils/logger';

/**
 * Joi schema for MongoDB ObjectId validation
 */
const objectIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid link ID format',
    'any.required': 'Link ID is required',
  });

/**
 * Joi schema for array of MongoDB ObjectIds
 */
const objectIdArraySchema = Joi.array()
  .items(
    Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .messages({
        'string.pattern.base': 'Invalid link ID format',
      })
  )
  .min(1)
  .max(10)
  .required()
  .messages({
    'array.min': 'At least one link ID is required',
    'array.max': 'Cannot compare more than 10 links at once',
    'any.required': 'Link IDs are required',
  });

/**
 * Joi schema for date validation
 */
const dateSchema = Joi.date().iso().messages({
  'date.base': 'Invalid date format. Use ISO 8601 format (e.g., 2025-11-13T00:00:00Z)',
  'date.format': 'Date must be in ISO 8601 format',
});

/**
 * Joi schema for pagination parameters
 */
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1',
  }),
  limit: Joi.number().integer().min(1).max(1000).default(100).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 1000',
  }),
});

/**
 * Joi schema for date range query parameters
 */
const dateRangeSchema = Joi.object({
  startDate: dateSchema.optional().messages({
    'any.required': 'Start date is required',
  }),
  endDate: dateSchema.optional().messages({
    'any.required': 'End date is required',
  }),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(100),
}).custom((value, helpers) => {
  // Ensure startDate is before endDate if both are provided
  if (value.startDate && value.endDate) {
    const start = new Date(value.startDate);
    const end = new Date(value.endDate);

    if (start >= end) {
      return helpers.error('date.range', {
        message: 'Start date must be before end date',
      });
    }

    // Ensure date range is not more than 2 years
    const maxRange = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years in milliseconds
    if (end.getTime() - start.getTime() > maxRange) {
      return helpers.error('date.range', {
        message: 'Date range cannot exceed 2 years',
      });
    }
  }

  return value;
});

/**
 * Joi schema for timeline period parameter
 */
const timelinePeriodSchema = Joi.object({
  period: Joi.string()
    .valid('hour', 'day', 'week', 'month', 'year')
    .default('day')
    .messages({
      'any.only': 'Period must be one of: hour, day, week, month, year',
    }),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
}).custom((value, helpers) => {
  // Validate date range if provided
  if (value.startDate && value.endDate) {
    const start = new Date(value.startDate);
    const end = new Date(value.endDate);

    if (start >= end) {
      return helpers.error('date.range', {
        message: 'Start date must be before end date',
      });
    }

    // Ensure date range is appropriate for the period
    const maxRanges: Record<string, number> = {
      hour: 7 * 24 * 60 * 60 * 1000, // 7 days for hourly data
      day: 365 * 24 * 60 * 60 * 1000, // 1 year for daily data
      week: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years for weekly data
      month: 5 * 365 * 24 * 60 * 60 * 1000, // 5 years for monthly data
      year: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years for yearly data
    };

    const period = value.period || 'day';
    const maxRange = maxRanges[period];

    if (end.getTime() - start.getTime() > maxRange) {
      return helpers.error('date.range', {
        message: `Date range for '${period}' period cannot exceed the allowed limit`,
      });
    }
  }

  return value;
});

/**
 * Joi schema for compare links query parameters
 */
const compareLinksSchema = Joi.object({
  linkIds: Joi.alternatives()
    .try(
      // Accept comma-separated string
      Joi.string().custom((value, helpers) => {
        const ids = value.split(',').map((id: string) => id.trim());
        if (ids.length < 1 || ids.length > 10) {
          return helpers.error('array.length', {
            message: 'Must provide between 1 and 10 link IDs',
          });
        }
        // Validate each ID
        for (const id of ids) {
          if (!/^[0-9a-fA-F]{24}$/.test(id)) {
            return helpers.error('string.pattern.base', {
              message: `Invalid link ID format: ${id}`,
            });
          }
        }
        return ids;
      }),
      // Accept array
      objectIdArraySchema
    )
    .required()
    .messages({
      'any.required': 'linkIds parameter is required',
    }),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
});

/**
 * Middleware to validate link ID parameter
 */
export const validateLinkIdParam = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const schema = Joi.object({
      linkId: objectIdSchema,
    });

    const { error, value } = schema.validate(req.params);

    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    req.params = value;
    next();
  } catch (error) {
    logger.error('Link ID validation error:', error);
    next(error);
  }
};

/**
 * Middleware to validate date range query parameters
 */
export const validateDateRangeQuery = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const { error, value } = dateRangeSchema.validate(req.query, {
      stripUnknown: true,
    });

    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    req.query = value;
    next();
  } catch (error) {
    logger.error('Date range validation error:', error);
    next(error);
  }
};

/**
 * Middleware to validate timeline query parameters
 */
export const validateTimelineQuery = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const { error, value } = timelinePeriodSchema.validate(req.query, {
      stripUnknown: true,
    });

    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    req.query = value;
    next();
  } catch (error) {
    logger.error('Timeline validation error:', error);
    next(error);
  }
};

/**
 * Middleware to validate compare links query parameters
 */
export const validateCompareLinksQuery = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const { error, value } = compareLinksSchema.validate(req.query, {
      stripUnknown: true,
    });

    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    // Convert comma-separated string to array if needed
    if (typeof value.linkIds === 'string') {
      value.linkIds = value.linkIds.split(',').map((id: string) => id.trim());
    }

    req.query = value;
    next();
  } catch (error) {
    logger.error('Compare links validation error:', error);
    next(error);
  }
};

/**
 * Middleware to validate pagination query parameters
 */
export const validatePaginationQuery = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const { error, value } = paginationSchema.validate(req.query, {
      stripUnknown: true,
    });

    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    req.query = value;
    next();
  } catch (error) {
    logger.error('Pagination validation error:', error);
    next(error);
  }
};

/**
 * Combined middleware for link analytics with date range and pagination
 */
export const validateLinkAnalyticsQuery = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const combinedSchema = dateRangeSchema.concat(
      Joi.object({
        // Allow additional query parameters that might be needed
      })
    );

    const { error, value } = combinedSchema.validate(req.query, {
      stripUnknown: true,
    });

    if (error) {
      throw new ValidationError(error.details[0].message);
    }

    req.query = value;
    next();
  } catch (error) {
    logger.error('Link analytics query validation error:', error);
    next(error);
  }
};
