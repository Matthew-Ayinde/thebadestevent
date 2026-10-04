import mongoose, { Schema, Document } from 'mongoose';

export type MeetingStatus = 'pending' | 'booked' | 'cancelled';

export interface IMeetingRequest extends Document {
  fullName: string;
  email: string;
  reason: string;
  status: MeetingStatus;
  // 'website' = started on our booking flow; 'cal' = booked directly on Cal.com (seen via webhook).
  source: 'website' | 'cal';
  accessToken: string;
  bookingUid?: string;
  eventTitle?: string;
  startTime?: Date;
  endTime?: Date;
  timeZone?: string;
  location?: string;
  meetingUrl?: string;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MeetingRequestSchema = new Schema<IMeetingRequest>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    reason: { type: String, default: '', trim: true },
    status: { type: String, enum: ['pending', 'booked', 'cancelled'], default: 'pending', index: true },
    source: { type: String, enum: ['website', 'cal'], default: 'website' },
    // Lets the browser that created the request mark it booked, without exposing a public write.
    accessToken: { type: String, required: true, select: false },
    bookingUid: { type: String, index: true },
    eventTitle: String,
    startTime: Date,
    endTime: Date,
    timeZone: String,
    location: String,
    meetingUrl: String,
    cancellationReason: String,
  },
  { timestamps: true }
);

export const MeetingRequest =
  mongoose.models.MeetingRequest ||
  mongoose.model<IMeetingRequest>('MeetingRequest', MeetingRequestSchema);
