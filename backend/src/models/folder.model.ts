import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// Folder interface - represents a folder/group for organizing links
export interface IFolder {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  userId: Types.ObjectId;
  parentId?: Types.ObjectId;
  linksCount: number;
  isArchived: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Folder document interface with methods
export interface IFolderDocument extends IFolder, Document {
  incrementLinksCount(): Promise<IFolderDocument>;
  decrementLinksCount(): Promise<IFolderDocument>;
}

// Folder model interface with static methods
export interface IFolderModel extends Model<IFolderDocument> {
  findByUser(userId: string): Promise<IFolderDocument[]>;
  findByUserWithLinks(userId: string): Promise<IFolderDocument[]>;
}

// Folder schema definition
const FolderSchema = new Schema<IFolderDocument, IFolderModel>(
  {
    name: {
      type: String,
      required: [true, 'Folder name is required'],
      trim: true,
      maxlength: [100, 'Folder name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    color: {
      type: String,
      default: '#6366f1', // Indigo color
      match: [/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color'],
    },
    icon: {
      type: String,
      default: 'folder',
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
    },
    linksCount: {
      type: Number,
      default: 0,
      min: [0, 'Links count cannot be negative'],
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'folders',
  }
);

// Indexes
FolderSchema.index({ userId: 1, name: 1 }, { unique: true }); // Unique folder names per user
FolderSchema.index({ userId: 1, parentId: 1 });
FolderSchema.index({ userId: 1, createdAt: -1 });

// Method to increment links count
FolderSchema.methods.incrementLinksCount = async function (): Promise<IFolderDocument> {
  const folder = this as IFolderDocument;
  folder.linksCount += 1;
  return await folder.save();
};

// Method to decrement links count
FolderSchema.methods.decrementLinksCount = async function (): Promise<IFolderDocument> {
  const folder = this as IFolderDocument;
  if (folder.linksCount > 0) {
    folder.linksCount -= 1;
  }
  return await folder.save();
};

// Static method to find folders by user
FolderSchema.statics.findByUser = async function (userId: string): Promise<IFolderDocument[]> {
  return this.find({ userId, isArchived: false }).sort({ name: 1 });
};

// Static method to find folders with link counts
FolderSchema.statics.findByUserWithLinks = async function (userId: string): Promise<IFolderDocument[]> {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), isArchived: false } },
    {
      $lookup: {
        from: 'links',
        localField: '_id',
        foreignField: 'folderId',
        as: 'links',
      },
    },
    {
      $addFields: {
        linksCount: { $size: '$links' },
      },
    },
    {
      $project: {
        links: 0,
      },
    },
    { $sort: { name: 1 } },
  ]);
};

// Create and export the Folder model
const Folder = mongoose.model<IFolderDocument, IFolderModel>('Folder', FolderSchema);

export default Folder;
