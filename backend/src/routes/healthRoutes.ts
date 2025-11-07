import { Router } from 'express';
import { healthCheck, readinessCheck, livenessCheck } from '../controllers/healthController';

const router = Router();

router.get('/health', healthCheck);
router.get('/ready', readinessCheck);
router.get('/live', livenessCheck);

export default router;
