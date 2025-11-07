import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  MONGODB_URI: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRE: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRE: string;
  FRONTEND_URL: string;
  EMAIL_HOST: string;
  EMAIL_PORT: number;
  EMAIL_USER: string;
  EMAIL_PASSWORD: string;
  EMAIL_FROM: string;
}

const getEnvVariable = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
};

export const config: EnvConfig = {
  NODE_ENV: getEnvVariable('NODE_ENV', 'development'),
  PORT: parseInt(getEnvVariable('PORT', '5000'), 10),
  MONGODB_URI: getEnvVariable('MONGODB_URI', 'mongodb://admin:admin123@localhost:27017/tinyurl?authSource=admin'),
  REDIS_URL: getEnvVariable('REDIS_URL', 'redis://localhost:6379'),
  JWT_SECRET: getEnvVariable('JWT_SECRET', 'your-super-secret-jwt-key-change-in-production-min-32-chars'),
  JWT_EXPIRE: getEnvVariable('JWT_EXPIRE', '7d'),
  JWT_REFRESH_SECRET: getEnvVariable('JWT_REFRESH_SECRET', 'your-super-secret-refresh-key-change-in-production-min-32-chars'),
  JWT_REFRESH_EXPIRE: getEnvVariable('JWT_REFRESH_EXPIRE', '30d'),
  FRONTEND_URL: getEnvVariable('FRONTEND_URL', 'http://localhost:3000'),
  EMAIL_HOST: getEnvVariable('EMAIL_HOST', 'smtp.gmail.com'),
  EMAIL_PORT: parseInt(getEnvVariable('EMAIL_PORT', '587'), 10),
  EMAIL_USER: getEnvVariable('EMAIL_USER', ''),
  EMAIL_PASSWORD: getEnvVariable('EMAIL_PASSWORD', ''),
  EMAIL_FROM: getEnvVariable('EMAIL_FROM', 'noreply@tinyurl.com'),
};

// Validate required environment variables in production
if (config.NODE_ENV === 'production') {
  const requiredVars: (keyof EnvConfig)[] = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'MONGODB_URI',
    'REDIS_URL',
  ];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Required environment variable ${varName} is not set in production`);
    }
  }
}
