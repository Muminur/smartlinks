import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable is required. Please set it in your .env file.');
    }

    // Configure connection options for remote MongoDB server
    const connectionOptions = {
      serverSelectionTimeoutMS: 30000, // 30 seconds timeout for initial connection
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      connectTimeoutMS: 30000, // 30 seconds connection timeout
      maxPoolSize: 10, // Connection pool size
      minPoolSize: 2,
      retryWrites: true,
      retryReads: true,
      directConnection: true, // Important for remote servers with single node
    };

    // Attempt connection with retry logic
    let retries = 5;
    let lastError: any;

    while (retries > 0) {
      try {
        await mongoose.connect(mongoURI, connectionOptions);
        logger.info(`MongoDB Connected: ${mongoose.connection.host}`);
        break;
      } catch (err) {
        lastError = err;
        retries--;
        if (retries > 0) {
          const delay = (6 - retries) * 2000; // Exponential backoff: 2s, 4s, 6s, 8s, 10s
          logger.warn(`MongoDB connection failed. Retrying in ${delay / 1000}s... (${retries} retries left)`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (retries === 0) {
      throw lastError;
    }

    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
    });

    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connection established');
    });
  } catch (error) {
    logger.error('Error connecting to MongoDB after all retries:', error);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
    process.exit(1);
  }
};
