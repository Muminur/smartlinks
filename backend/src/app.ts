import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config/env';
import { morganStream } from './utils/logger';
import { errorHandler, notFound } from './middleware/errorMiddleware';
import { apiLimiter } from './middleware/rateLimiter';
import routes from './routes';
import redirectRoutes from './routes/redirect.routes';

const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.CORS_ORIGIN?.split(',') || config.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser middleware
app.use(cookieParser());

// Compression middleware
app.use(compression());

// HTTP request logger
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: morganStream }));
}

// Trust proxy (required for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Apply rate limiting to API routes only
app.use('/api/', apiLimiter);

// API routes (mounted under /api prefix)
app.use('/api', routes);

// Root endpoint (server info)
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'TinyURL Clone API Server',
    version: '1.0.0',
    documentation: '/api/docs',
  });
});

// Redirect routes (mounted at root level for /:slug pattern)
// IMPORTANT: This must come AFTER the root endpoint but BEFORE 404 handler
// Routes: /:slug, /api/links/preview/:slug, /api/redirect/stats
app.use('/', redirectRoutes);

// Handle 404 errors
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
