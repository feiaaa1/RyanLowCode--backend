import mongoose, { Schema, Document } from 'mongoose';

interface ProjectMember {
  userId: mongoose.Types.ObjectId;
  role: 'owner' | 'editor' | 'viewer';
}

export interface IProject extends Document {
  name: string;
  description?: string;
  owner: mongoose.Types.ObjectId;
  members: ProjectMember[];
  thumbnail?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['owner', 'editor', 'viewer'],
          default: 'viewer',
        },
      },
    ],
    thumbnail: {
      type: String,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
projectSchema.index({ owner: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ owner: 1, name: 1 });

export const Project = mongoose.model<IProject>('Project', projectSchema);
