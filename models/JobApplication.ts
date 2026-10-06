import mongoose, { Schema, Document, Types } from 'mongoose';
import { APPLICATION_STATUSES, type ApplicationStatus } from '@/lib/careers';

export interface IApplicationAnswer {
  questionId: string;
  // Label and type are snapshotted so later edits to the role don't rewrite past answers.
  label: string;
  type: string;
  value: string;
}

export interface IApplicationResume {
  publicId: string;
  fileName: string;
  format: string;
  bytes: number;
}

export interface IJobApplication extends Document {
  job: Types.ObjectId;
  jobTitle: string;
  jobSlug: string;
  fullName: string;
  email: string;
  phone: string;
  location?: string;
  linkedin?: string;
  portfolio?: string;
  coverLetter?: string;
  resume?: IApplicationResume;
  answers: IApplicationAnswer[];
  status: ApplicationStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobApplicationSchema = new Schema<IJobApplication>(
  {
    job: { type: Schema.Types.ObjectId, ref: 'JobPosting', required: true, index: true },
    jobTitle: { type: String, required: true },
    jobSlug: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    location: { type: String, trim: true },
    linkedin: { type: String, trim: true },
    portfolio: { type: String, trim: true },
    coverLetter: { type: String },
    resume: {
      type: new Schema<IApplicationResume>(
        {
          publicId: { type: String, required: true },
          fileName: { type: String, required: true },
          format: { type: String, default: '' },
          bytes: { type: Number, default: 0 },
        },
        { _id: false }
      ),
      required: false,
    },
    answers: {
      type: [
        new Schema<IApplicationAnswer>(
          {
            questionId: String,
            label: String,
            type: String,
            value: String,
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'new', index: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

// One application per person per role; also closes the race the API's pre-check can't.
JobApplicationSchema.index({ job: 1, email: 1 }, { unique: true });

export const JobApplication =
  mongoose.models.JobApplication ||
  mongoose.model<IJobApplication>('JobApplication', JobApplicationSchema);
