import mongoose, { Schema, Document } from 'mongoose';
import { FormNode } from '../types/formNode.types';

export interface IPage extends Document {
  name: string;
  projectId: mongoose.Types.ObjectId;
  formNodeTree: FormNode[];
  thumbnail?: string;
  version: number;
  status: 'draft' | 'published';
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const pageSchema = new Schema<IPage>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    formNodeTree: {
      type: Schema.Types.Mixed,
      required: true,
      default: [],
    },
    thumbnail: {
      type: String,
    },
    version: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
pageSchema.index({ projectId: 1 });
pageSchema.index({ createdAt: -1 });
pageSchema.index({ projectId: 1, name: 1 });
pageSchema.index({ status: 1 });

export const Page = mongoose.model<IPage>('Page', pageSchema);
