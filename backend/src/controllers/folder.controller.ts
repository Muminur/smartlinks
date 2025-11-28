import { Request, Response, NextFunction } from 'express';
import Folder from '../models/folder.model';
import Link from '../models/link.model';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';
import { NotFoundError, ValidationError } from '../utils/errorHandler';
import mongoose from 'mongoose';

/**
 * Create a new folder
 * POST /api/folders
 */
export const createFolderController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { name, description, color, icon, parentId } = req.body;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      };
      res.status(401).json(response);
      return;
    }

    // Check if folder with same name already exists for user
    const existingFolder = await Folder.findOne({ userId, name });
    if (existingFolder) {
      throw new ValidationError('A folder with this name already exists');
    }

    // Validate parentId if provided
    if (parentId) {
      const parentFolder = await Folder.findOne({ _id: parentId, userId });
      if (!parentFolder) {
        throw new NotFoundError('Parent folder not found');
      }
    }

    const folder = new Folder({
      name,
      description,
      color,
      icon,
      userId,
      parentId: parentId || null,
    });

    await folder.save();

    const response: ApiResponse = {
      success: true,
      data: { folder },
      message: 'Folder created successfully',
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Create folder controller error:', error);
    next(error);
  }
};

/**
 * Get all folders for user
 * GET /api/folders
 */
export const getFoldersController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { includeArchived } = req.query;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      };
      res.status(401).json(response);
      return;
    }

    const query: Record<string, unknown> = { userId };
    if (includeArchived !== 'true') {
      query.isArchived = false;
    }

    const folders = await Folder.find(query).sort({ name: 1 });

    // Get link counts for each folder
    const folderIds = folders.map(f => f._id);
    const linkCounts = await Link.aggregate([
      { $match: { folderId: { $in: folderIds } } },
      { $group: { _id: '$folderId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map(linkCounts.map(lc => [String(lc._id), lc.count]));
    const foldersWithCounts = folders.map(folder => ({
      ...folder.toObject(),
      linksCount: countMap.get(String(folder._id)) || 0,
    }));

    const response: ApiResponse = {
      success: true,
      data: { folders: foldersWithCounts },
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get folders controller error:', error);
    next(error);
  }
};

/**
 * Get single folder by ID
 * GET /api/folders/:id
 */
export const getFolderController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { id } = req.params;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      };
      res.status(401).json(response);
      return;
    }

    const folder = await Folder.findOne({ _id: id, userId });
    if (!folder) {
      throw new NotFoundError('Folder not found');
    }

    // Get link count
    const linksCount = await Link.countDocuments({ folderId: folder._id });

    const response: ApiResponse = {
      success: true,
      data: {
        folder: {
          ...folder.toObject(),
          linksCount,
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get folder controller error:', error);
    next(error);
  }
};

/**
 * Update folder
 * PUT /api/folders/:id
 */
export const updateFolderController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { id } = req.params;
    const { name, description, color, icon, parentId, isArchived } = req.body;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      };
      res.status(401).json(response);
      return;
    }

    const folder = await Folder.findOne({ _id: id, userId });
    if (!folder) {
      throw new NotFoundError('Folder not found');
    }

    // Check for duplicate name if name is being changed
    if (name && name !== folder.name) {
      const existingFolder = await Folder.findOne({ userId, name, _id: { $ne: id } });
      if (existingFolder) {
        throw new ValidationError('A folder with this name already exists');
      }
    }

    // Validate parentId if provided
    if (parentId) {
      if (parentId === id) {
        throw new ValidationError('A folder cannot be its own parent');
      }
      const parentFolder = await Folder.findOne({ _id: parentId, userId });
      if (!parentFolder) {
        throw new NotFoundError('Parent folder not found');
      }
    }

    // Update fields
    if (name !== undefined) folder.name = name;
    if (description !== undefined) folder.description = description;
    if (color !== undefined) folder.color = color;
    if (icon !== undefined) folder.icon = icon;
    if (parentId !== undefined) folder.parentId = parentId || undefined;
    if (isArchived !== undefined) folder.isArchived = isArchived;

    await folder.save();

    const response: ApiResponse = {
      success: true,
      data: { folder },
      message: 'Folder updated successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Update folder controller error:', error);
    next(error);
  }
};

/**
 * Delete folder
 * DELETE /api/folders/:id
 */
export const deleteFolderController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { id } = req.params;
    const { moveLinksTo } = req.query; // Optional: move links to another folder

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      };
      res.status(401).json(response);
      return;
    }

    const folder = await Folder.findOne({ _id: id, userId });
    if (!folder) {
      throw new NotFoundError('Folder not found');
    }

    // Handle links in this folder
    if (moveLinksTo) {
      // Move links to another folder
      const targetFolder = await Folder.findOne({ _id: moveLinksTo, userId });
      if (!targetFolder) {
        throw new NotFoundError('Target folder not found');
      }
      await Link.updateMany({ folderId: id }, { folderId: moveLinksTo });
    } else {
      // Remove folder assignment from links (move to uncategorized)
      await Link.updateMany({ folderId: id }, { folderId: null });
    }

    // Move child folders to parent or root
    await Folder.updateMany(
      { parentId: id },
      { parentId: folder.parentId || null }
    );

    await folder.deleteOne();

    const response: ApiResponse = {
      success: true,
      message: 'Folder deleted successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Delete folder controller error:', error);
    next(error);
  }
};

/**
 * Get links in folder
 * GET /api/folders/:id/links
 */
export const getFolderLinksController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { id } = req.params;
    const { page = '1', limit = '20', sort = '-createdAt' } = req.query;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      };
      res.status(401).json(response);
      return;
    }

    const folder = await Folder.findOne({ _id: id, userId });
    if (!folder) {
      throw new NotFoundError('Folder not found');
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const links = await Link.find({ folderId: id, userId })
      .sort(sort as string)
      .skip(skip)
      .limit(limitNum);

    const total = await Link.countDocuments({ folderId: id, userId });

    const response: ApiResponse = {
      success: true,
      data: {
        links,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get folder links controller error:', error);
    next(error);
  }
};

/**
 * Move links to folder
 * POST /api/folders/:id/links
 */
export const moveLinksToFolderController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { id } = req.params;
    const { linkIds } = req.body;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      };
      res.status(401).json(response);
      return;
    }

    // Validate folder (id can be 'null' or 'uncategorized' to remove from folder)
    let folderId: mongoose.Types.ObjectId | null = null;
    if (id !== 'null' && id !== 'uncategorized') {
      const folder = await Folder.findOne({ _id: id, userId });
      if (!folder) {
        throw new NotFoundError('Folder not found');
      }
      folderId = folder._id as mongoose.Types.ObjectId;
    }

    // Update links
    const result = await Link.updateMany(
      { _id: { $in: linkIds }, userId },
      { folderId }
    );

    const response: ApiResponse = {
      success: true,
      data: { modifiedCount: result.modifiedCount },
      message: `${result.modifiedCount} links moved successfully`,
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Move links to folder controller error:', error);
    next(error);
  }
};
