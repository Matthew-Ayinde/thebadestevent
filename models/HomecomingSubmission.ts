import mongoose, { Schema, Document } from 'mongoose';

export interface IHomecomingSubmission extends Document {
  name: string;
  contactMethod: string;
  contactValue: string;
  visitorType: string;
  timeframe: string;
  familyAware: string;
  reason: string;
  reasonOther?: string;
  challenges: string[];
  challengesOther?: string;
  wantsHelp: string;
  excitedFor: string[];
  excitedForOther?: string;
  heardOfDWL: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const HomecomingSubmissionSchema = new Schema<IHomecomingSubmission>(
  {
    name: { type: String, required: true },
    contactMethod: { type: String, required: true },
    contactValue: { type: String, required: true },
    visitorType: { type: String, required: true },
    timeframe: { type: String, required: true },
    familyAware: { type: String, required: true },
    reason: { type: String, required: true },
    reasonOther: { type: String },
    challenges: { type: [String], default: [] },
    challengesOther: { type: String },
    wantsHelp: { type: String, required: true },
    excitedFor: { type: [String], default: [] },
    excitedForOther: { type: String },
    heardOfDWL: { type: String, required: true },
    status: { type: String, default: 'new' },
  },
  { timestamps: true }
);

export const HomecomingSubmission =
  mongoose.models.HomecomingSubmission ||
  mongoose.model<IHomecomingSubmission>('HomecomingSubmission', HomecomingSubmissionSchema);
