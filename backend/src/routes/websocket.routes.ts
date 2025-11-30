import { Router, Request, Response } from 'express';
import { websocketService } from '../services/websocket.service';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';
import { UserRole } from '../types';

const router = Router();

/**
 * GET /api/websocket/stats
 * Get WebSocket server statistics (admin only)
 * @access Admin
 */
router.get(
  '/stats',
  authenticateToken,
  authorizeRoles(UserRole.ADMIN),
  (_req: Request, res: Response) => {
    try {
      const stats = websocketService.getRoomStats();

      res.status(200).json({
        success: true,
        data: {
          ...stats,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'WEBSOCKET_STATS_ERROR',
          message: 'Failed to get WebSocket statistics',
        },
      });
    }
  }
);

/**
 * GET /api/websocket/health
 * Check WebSocket server health
 * @access Public
 */
router.get('/health', (_req: Request, res: Response) => {
  try {
    const io = websocketService.getIO();
    const isHealthy = io !== null;
    const activeConnections = websocketService.getActiveConnectionCount();

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        activeConnections,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (_error) {
    res.status(503).json({
      success: false,
      data: {
        status: 'unhealthy',
        error: 'WebSocket server not available',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * GET /api/websocket/link/:linkId/subscribers
 * Get subscriber count for a specific link
 * @access Authenticated
 */
router.get(
  '/link/:linkId/subscribers',
  authenticateToken,
  (req: Request, res: Response) => {
    try {
      const { linkId } = req.params;
      const subscriberCount = websocketService.getLinkSubscriberCount(linkId);

      res.status(200).json({
        success: true,
        data: {
          linkId,
          subscriberCount,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (_error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'SUBSCRIBER_COUNT_ERROR',
          message: 'Failed to get subscriber count',
        },
      });
    }
  }
);

export default router;
