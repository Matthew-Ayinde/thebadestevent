import mongoose, { Schema, Document, type Model } from 'mongoose';

export interface IMedallionGuest extends Document {
  firstName: string;
  lastName: string;
  email: string;
  token: string;
  code: string;
  checkedInAt?: Date | null;
  emailSentAt?: Date | null;
  emailError?: string | null;
  reminderSentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const MedallionGuestSchema = new Schema<IMedallionGuest>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    token: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    checkedInAt: { type: Date, default: null, index: true },
    emailSentAt: { type: Date, default: null },
    emailError: { type: String, default: null },
    reminderSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const MedallionGuest: Model<IMedallionGuest> =
  (mongoose.models.MedallionGuest as Model<IMedallionGuest>) ||
  mongoose.model<IMedallionGuest>('MedallionGuest', MedallionGuestSchema);
