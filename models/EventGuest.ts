import mongoose, { Schema, Document, type Model, type Types } from 'mongoose';

export interface IEventGuest extends Document {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
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

const EventGuestSchema = new Schema<IEventGuest>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'EventSite', required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    // Tokens and codes are globally unique so a scan or ticket link can never match another event's guest.
    token: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    checkedInAt: { type: Date, default: null },
    emailSentAt: { type: Date, default: null },
    emailError: { type: String, default: null },
    reminderSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One RSVP per email per event — the same person can attend different events.
EventGuestSchema.index({ eventId: 1, email: 1 }, { unique: true });
EventGuestSchema.index({ eventId: 1, checkedInAt: -1 });
EventGuestSchema.index({ eventId: 1, createdAt: -1 });

// Model name kept as 'MedallionGuest' so it keeps using the existing `medallionguests` collection.
export const EventGuest: Model<IEventGuest> =
  (mongoose.models.MedallionGuest as Model<IEventGuest>) ||
  mongoose.model<IEventGuest>('MedallionGuest', EventGuestSchema);
