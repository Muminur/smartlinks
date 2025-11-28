import { Router } from 'express';
import {
  createFolderController,
  getFoldersController,
  getFolderController,
  updateFolderController,
  deleteFolderController,
  getFolderLinksController,
  moveLinksToFolderController,
} from '../controllers/folder.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All folder routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/folders
 * @desc    Create a new folder
 * @access  Private
 */
router.post('/', createFolderController);

/**
 * @route   GET /api/folders
 * @desc    Get all folders for user
 * @access  Private
 */
router.get('/', getFoldersController);

/**
 * @route   GET /api/folders/:id
 * @desc    Get single folder by ID
 * @access  Private
 */
router.get('/:id', getFolderController);

/**
 * @route   PUT /api/folders/:id
 * @desc    Update folder
 * @access  Private
 */
router.put('/:id', updateFolderController);

/**
 * @route   DELETE /api/folders/:id
 * @desc    Delete folder
 * @access  Private
 */
router.delete('/:id', deleteFolderController);

/**
 * @route   GET /api/folders/:id/links
 * @desc    Get links in folder
 * @access  Private
 */
router.get('/:id/links', getFolderLinksController);

/**
 * @route   POST /api/folders/:id/links
 * @desc    Move links to folder
 * @access  Private
 */
router.post('/:id/links', moveLinksToFolderController);

export default router;
