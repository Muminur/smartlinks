import { Router } from 'express';
import {
  createShareController,
  getSharesForLinkController,
  getSharedWithMeController,
  accessShareController,
  revokeShareController,
  updateShareController,
} from '../controllers/share.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/shares
 * @desc    Create a share link
 * @access  Private
 */
router.post('/', authenticateToken, createShareController);

/**
 * @route   GET /api/shares/link/:linkId
 * @desc    Get shares for a link
 * @access  Private
 */
router.get('/link/:linkId', authenticateToken, getSharesForLinkController);

/**
 * @route   GET /api/shares/shared-with-me
 * @desc    Get links shared with current user
 * @access  Private
 */
router.get('/shared-with-me', authenticateToken, getSharedWithMeController);

/**
 * @route   GET /api/shares/access/:token
 * @desc    Access shared link by token
 * @access  Public (with valid token)
 */
router.get('/access/:token', accessShareController);

/**
 * @route   PUT /api/shares/:id
 * @desc    Update share permissions
 * @access  Private
 */
router.put('/:id', authenticateToken, updateShareController);

/**
 * @route   DELETE /api/shares/:id
 * @desc    Revoke a share
 * @access  Private
 */
router.delete('/:id', authenticateToken, revokeShareController);

export default router;
