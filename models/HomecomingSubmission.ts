import mongoose, { Schema, Document } from 'mongoose';

export interface IHomecomingSubmission extends Document {
  name: string;
  contactMethod: string;
  contactValue: string;
  residence: string;
  residenceOther?: string;
  lastHome?: string;
  arrival?: string;
  stayLength?: string;
  companions?: string;
  reason: string[];
  reasonOther?: string;
  weddingHelp?: string;
  accommodation?: string;
  budget?: string;
  needs: string[];
  needsOther?: string;
  excitedFor: string[];
  excitedForOther?: string;
  perks?: string;
  partnerConsent?: boolean;
  heardFrom?: string;
  heardFromOther?: string;
  // Legacy fields from the first version of the questionnaire — kept so
  // older submissions still load and display in the admin.
  visitorType?: string;
  timeframe?: string;
  familyAware?: string;
  challenges?: string[];
  challengesOther?: string;
  wantsHelp?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const HomecomingSubmissionSchema = new Schema<IHomecomingSubmission>(
  {
    name: { type: String, required: true },
    contactMethod: { type: String, required: true },
    contactValue: { type: String, required: true },
    residence: { type: String, required: true },
    residenceOther: { type: String },
    lastHome: { type: String },
    arrival: { type: String },
    stayLength: { type: String },
    companions: { type: String },
    reason: { type: [String], default: [] },
    reasonOther: { type: String },
    weddingHelp: { type: String },
    accommodation: { type: String },
    budget: { type: String },
    needs: { type: [String], default: [] },
    needsOther: { type: String },
    excitedFor: { type: [String], default: [] },
    excitedForOther: { type: String },
    perks: { type: String },
    partnerConsent: { type: Boolean, default: false },
    heardFrom: { type: String },
    heardFromOther: { type: String },
    visitorType: { type: String },
    timeframe: { type: String },
    familyAware: { type: String },
    challenges: { type: [String], default: undefined },
    challengesOther: { type: String },
    wantsHelp: { type: String },
    status: { type: String, default: 'new' },
  },
  { timestamps: true }
);

export const HomecomingSubmission =
  mongoose.models.HomecomingSubmission ||
  mongoose.model<IHomecomingSubmission>('HomecomingSubmission', HomecomingSubmissionSchema);
