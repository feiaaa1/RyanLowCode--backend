import mongoose, { Schema, Document } from 'mongoose';

interface DataSourceConfig {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  data?: any;
}

export interface IDataSource extends Document {
  name: string;
  projectId: mongoose.Types.ObjectId;
  type: 'api' | 'database' | 'static';
  config: DataSourceConfig;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const dataSourceSchema = new Schema<IDataSource>(
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
    type: {
      type: String,
      enum: ['api', 'database', 'static'],
      required: true,
    },
    config: {
      type: Schema.Types.Mixed,
      required: true,
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
dataSourceSchema.index({ projectId: 1 });
dataSourceSchema.index({ type: 1 });

export const DataSource = mongoose.model<IDataSource>('DataSource', dataSourceSchema);
