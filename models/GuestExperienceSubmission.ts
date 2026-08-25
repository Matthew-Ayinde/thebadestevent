import mongoose, { Schema, Document } from 'mongoose';

export interface IGuestExperienceSubmission extends Document {
  welcomed: string;
  anticipatedMoment: string;
  anticipatedMomentDetail?: string;
  caredForScore: string;
  overlookedMoment?: string;
  wouldReturn: string;
  createdAt: Date;
  updatedAt: Date;
}

const GuestExperienceSubmissionSchema = new Schema<IGuestExperienceSubmission>(
  {
    welcomed: { type: String, required: true },
    anticipatedMoment: { type: String, required: true },
    anticipatedMomentDetail: { type: String },
    caredForScore: { type: String, required: true },
    overlookedMoment: { type: String },
    wouldReturn: { type: String, required: true },
  },
  { timestamps: true }
);

export const GuestExperienceSubmission =
  mongoose.models.GuestExperienceSubmission ||
  mongoose.model<IGuestExperienceSubmission>('GuestExperienceSubmission', GuestExperienceSubmissionSchema);
