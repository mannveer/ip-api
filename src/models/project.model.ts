// models/project.model.ts
import mongoose, { Document, Schema } from 'mongoose';

// Define the Project interface
export interface IProject extends Document {
  title: string;
  description: string;
  imageUrl: string;
  projectUrl: string;
  category: string;
  available: boolean;
  featured?: boolean; 
  displayOrder?: number; 
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Project description is required'],
    },
    imageUrl: {
      type: String,
      required: [true, 'Project image URL is required'],
    },
    projectUrl: {
      type: String,
      required: [true, 'Project URL is required'],
    },
    category: {
      type: String,
      required: [true, 'Project category is required'],
      index: true, 
    },
    available: {
      type: Boolean,
      default: true,
    },
    featured: {
      type: Boolean,
      default: false, 
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 999, 
    },
  },
  {
    timestamps: true,
  }
);

projectSchema.index({ featured: 1, displayOrder: 1 });
projectSchema.index({ category: 1, available: 1 });

export default mongoose.model<IProject>('Project', projectSchema);