import { Router } from 'express';
import healthRoutes from './healthRoutes';
import authRoutes from './auth.routes';

const router = Router();

// Health check routes
router.use('/', healthRoutes);

// Authentication routes
router.use('/auth', authRoutes);

// Future routes will be added here
// router.use('/links', linkRoutes);
// router.use('/analytics', analyticsRoutes);
// router.use('/users', userRoutes);
// router.use('/domains', domainRoutes);
// router.use('/payments', paymentRoutes);
// router.use('/admin', adminRoutes);

export default router;
