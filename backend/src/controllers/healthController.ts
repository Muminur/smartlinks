import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getRedisClient } from '../config/redis';
import { asyncHandler } from '../middleware/errorMiddleware';

export const healthCheck = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const health = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development',
  };

  res.status(200).json({
    success: true,
    data: health,
  });
});

export const readinessCheck = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const checks = {
    mongodb: false,
    redis: false,
  };

  // Check MongoDB connection
  try {
    if (mongoose.connection.readyState === 1) {
      checks.mongodb = true;
    }
  } catch {
    checks.mongodb = false;
  }

  // Check Redis connection
  try {
    const redisClient = getRedisClient();
    if (redisClient) {
      const pong = await redisClient.ping();
      checks.redis = pong === 'PONG';
    } else {
      checks.redis = false;
    }
  } catch {
    checks.redis = false;
  }

  const allHealthy = Object.values(checks).every((check) => check === true);

  res.status(allHealthy ? 200 : 503).json({
    success: allHealthy,
    data: {
      status: allHealthy ? 'ready' : 'not ready',
      checks,
      timestamp: Date.now(),
    },
  });
});

export const livenessCheck = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    data: {
      status: 'alive',
      timestamp: Date.now(),
    },
  });
});
