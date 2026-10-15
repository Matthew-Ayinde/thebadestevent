import mongoose, { Schema, Document } from 'mongoose';

export interface ITalentCircleMember extends Document {
  fullName: string;
  email: string;
  whatsapp: string;
  city: string;
  crafts: string[];
  currentRole: string;
  experience: string;
  lookingFor: string[];
  startWhen: string;
  link: string;
  moment: string;
  dreamMove: string;
  consentAt: Date;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TalentCircleMemberSchema = new Schema<ITalentCircleMember>(
  {
    fullName: { type: String, required: true },
    // One entry per person: joining again refreshes their details.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    whatsapp: { type: String, required: true },
    city: { type: String, required: true },
    crafts: { type: [String], default: [] },
    currentRole: { type: String, default: '' },
    experience: { type: String, required: true },
    lookingFor: { type: [String], default: [] },
    startWhen: { type: String, required: true },
    link: { type: String, default: '' },
    moment: { type: String, default: '' },
    dreamMove: { type: String, default: '' },
    consentAt: { type: Date, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const TalentCircleMember =
  mongoose.models.TalentCircleMember || mongoose.model<ITalentCircleMember>('TalentCircleMember', TalentCircleMemberSchema);
