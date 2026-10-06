import mongoose, { Schema, Document } from 'mongoose';
import {
  JOB_STATUSES,
  FIELD_MODES,
  QUESTION_TYPES,
  type JobStatus,
  type FieldMode,
  type QuestionType,
} from '@/lib/careers';

export interface IJobQuestion {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options: string[];
}

export interface IApplicationFields {
  resume: FieldMode;
  coverLetter: FieldMode;
  linkedin: FieldMode;
  portfolio: FieldMode;
}

export interface IJobPosting extends Document {
  title: string;
  slug: string;
  company: string;
  department: string;
  location: string;
  workplace: string;
  type: string;
  compensation?: string;
  overview: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  status: JobStatus;
  closingDate?: Date;
  applicationFields: IApplicationFields;
  questions: IJobQuestion[];
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IJobQuestion>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: QUESTION_TYPES, default: 'short' },
    required: { type: Boolean, default: false },
    options: { type: [String], default: [] },
  },
  { _id: false }
);

const fieldMode = (fallback: FieldMode) => ({ type: String, enum: FIELD_MODES, default: fallback });

const JobPostingSchema = new Schema<IJobPosting>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true },
    company: { type: String, default: 'RÌNWÁ Hospitality & Experiences', trim: true },
    department: { type: String, default: '', trim: true },
    location: { type: String, required: true, trim: true },
    workplace: { type: String, default: 'On-site' },
    type: { type: String, required: true },
    compensation: { type: String, trim: true },
    overview: { type: String, required: true },
    responsibilities: { type: [String], default: [] },
    requirements: { type: [String], default: [] },
    niceToHave: { type: [String], default: [] },
    status: { type: String, enum: JOB_STATUSES, default: 'draft', index: true },
    closingDate: Date,
    applicationFields: {
      resume: fieldMode('required'),
      coverLetter: fieldMode('optional'),
      linkedin: fieldMode('optional'),
      portfolio: fieldMode('off'),
    },
    questions: { type: [QuestionSchema], default: [] },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Partial so postings created before slugs existed don't block the index build; see backfillLegacyJobs.
JobPostingSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { slug: { $type: 'string' } } });

export const JobPosting =
  mongoose.models.JobPosting || mongoose.model<IJobPosting>('JobPosting', JobPostingSchema);
