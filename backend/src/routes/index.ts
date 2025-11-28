import { Router } from 'express';
import healthRoutes from './healthRoutes';
import authRoutes from './auth.routes';
import linkRoutes from './link.routes';
import analyticsRoutes from './analytics.routes';
import folderRoutes from './folder.routes';
import shareRoutes from './share.routes';
import webhookRoutes from './webhook.routes';
import predictionRoutes from './prediction.routes';

const router = Router();

// Health check routes
router.use('/', healthRoutes);

// Authentication routes
router.use('/auth', authRoutes);

// Link management routes
router.use('/links', linkRoutes);

// Analytics routes
router.use('/analytics', analyticsRoutes);

// Folder management routes
router.use('/folders', folderRoutes);

// Share routes
router.use('/shares', shareRoutes);

// Webhook routes
router.use('/webhooks', webhookRoutes);

// Prediction routes
router.use('/predictions', predictionRoutes);

// Future routes will be added here
// router.use('/users', userRoutes);
// router.use('/domains', domainRoutes);
// router.use('/payments', paymentRoutes);
// router.use('/admin', adminRoutes);

export default router;
