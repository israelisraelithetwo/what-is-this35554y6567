import mongoose, { Document, Schema } from 'mongoose';

export interface ISubmission extends Document {
  formId: mongoose.Types.ObjectId;
  formData: any; // Submitted form data
  signature?: string; // Base64 encoded signature image
  submittedBy?: {
    name?: string;
    email?: string;
  };
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = new Schema<ISubmission>(
  {
    formId: {
      type: Schema.Types.ObjectId,
      ref: 'Form',
      required: [true, 'Form ID is required']
    },
    formData: {
      type: Schema.Types.Mixed,
      required: [true, 'Form data is required']
    },
    signature: {
      type: String
    },
    submittedBy: {
      name: String,
      email: String
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Index for better query performance
submissionSchema.index({ formId: 1, submittedAt: -1 });
submissionSchema.index({ createdAt: -1 });

export const Submission = mongoose.model<ISubmission>('Submission', submissionSchema);
