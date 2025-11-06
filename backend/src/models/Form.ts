import mongoose, { Document, Schema } from 'mongoose';

export interface IForm extends Document {
  title: string;
  description?: string;
  formStructure: any; // Formio.js schema
  createdBy: mongoose.Types.ObjectId;
  status: 'draft' | 'published';
  createdAt: Date;
  updatedAt: Date;
}

const formSchema = new Schema<IForm>(
  {
    title: {
      type: String,
      required: [true, 'Form title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    formStructure: {
      type: Schema.Types.Mixed,
      required: [true, 'Form structure is required']
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft'
    }
  },
  {
    timestamps: true
  }
);

// Index for better query performance
formSchema.index({ createdBy: 1, status: 1 });
formSchema.index({ createdAt: -1 });

export const Form = mongoose.model<IForm>('Form', formSchema);
