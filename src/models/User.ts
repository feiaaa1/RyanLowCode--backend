import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  username: string;
  role: 'admin' | 'user';
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },
    avatar: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

export const User = mongoose.model<IUser>('User', userSchema);
