import { Router } from 'express';
import healthRoutes from './healthRoutes';
import authRoutes from './auth.routes';
import linkRoutes from './link.routes';
import analyticsRoutes from './analytics.routes';

const router = Router();

// Health check routes
router.use('/', healthRoutes);

// Authentication routes
router.use('/auth', authRoutes);

// Link management routes
router.use('/links', linkRoutes);

// Analytics routes
router.use('/analytics', analyticsRoutes);

// Future routes will be added here
// router.use('/users', userRoutes);
// router.use('/domains', domainRoutes);
// router.use('/payments', paymentRoutes);
// router.use('/admin', adminRoutes);

export default router;
