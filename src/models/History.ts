import mongoose, { Schema, Document } from 'mongoose';
import { FormNode } from '../types/formNode.types';

export interface IHistory extends Document {
  pageId: mongoose.Types.ObjectId;
  version: number;
  formNodeTree: FormNode[];
  changedBy: mongoose.Types.ObjectId;
  changeDescription?: string;
  createdAt: Date;
}

const historySchema = new Schema<IHistory>(
  {
    pageId: {
      type: Schema.Types.ObjectId,
      ref: 'Page',
      required: true,
    },
    version: {
      type: Number,
      required: true,
    },
    formNodeTree: {
      type: Schema.Types.Mixed,
      required: true,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    changeDescription: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
historySchema.index({ pageId: 1, version: -1 });
historySchema.index({ createdAt: -1 });

export const History = mongoose.model<IHistory>('History', historySchema);
