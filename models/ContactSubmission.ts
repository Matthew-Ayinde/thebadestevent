import mongoose, { Schema, Document } from 'mongoose';

export interface IContactSubmission extends Document {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  projectDate: string;
  estimatedBudget: number;
  description: string;
  industry: string;
  goals: string[];
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSubmissionSchema = new Schema<IContactSubmission>(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: true,
    },
    company: {
      type: String,
      required: true,
    },
    projectDate: {
      type: String,
      required: true,
    },
    estimatedBudget: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    industry: {
      type: String,
      required: true,
    },
    goals: {
      type: [String],
      default: [],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const ContactSubmission = mongoose.models.ContactSubmission || mongoose.model<IContactSubmission>('ContactSubmission', ContactSubmissionSchema);
