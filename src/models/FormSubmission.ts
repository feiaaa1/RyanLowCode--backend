import mongoose, { Schema, Document } from 'mongoose';

export interface IFormSubmission extends Document {
  pageId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  payload: Record<string, any>;
  submitter?: {
    userId?: mongoose.Types.ObjectId;
    email?: string;
  };
  status: 'success' | 'failed';
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

const formSubmissionSchema = new Schema<IFormSubmission>(
  {
    pageId: {
      type: Schema.Types.ObjectId,
      ref: 'Page',
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    submitter: {
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      email: {
        type: String,
        trim: true,
      },
    },
    status: {
      type: String,
      enum: ['success', 'failed'],
      default: 'success',
    },
    message: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

formSubmissionSchema.index({ pageId: 1, createdAt: -1 });

export const FormSubmission = mongoose.model<IFormSubmission>('FormSubmission', formSubmissionSchema);
