import mongoose, { Schema, Document } from 'mongoose';
import { ConfigPanelList } from '../types/formNode.types';

export interface IComponent extends Document {
  type: string;
  name: string;
  category: string;
  icon?: string;
  configPanelList: ConfigPanelList;
  nodeType: string[];
  isBuiltIn: boolean;
  isPublic: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const componentSchema = new Schema<IComponent>(
  {
    type: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
    },
    configPanelList: {
      type: Schema.Types.Mixed,
      required: true,
    },
    nodeType: {
      type: [String],
      required: true,
    },
    isBuiltIn: {
      type: Boolean,
      default: false,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
componentSchema.index({ type: 1 });
componentSchema.index({ category: 1 });
componentSchema.index({ isPublic: 1 });

export const Component = mongoose.model<IComponent>('Component', componentSchema);
