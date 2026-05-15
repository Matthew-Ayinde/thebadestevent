import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  name: string;
  description: string;
  city: 'Lagos' | 'Toronto' | 'Vancouver' | 'Remote';
  weekday: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  date: string;
  time: string;
  location: string;
  rsvpLink: string;
  imageUrl: string;
  eventType: 'Dining' | 'Community' | 'Nightlife' | 'Creative' | 'Wellness';
  isFeatured: boolean;
  isPast: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      enum: ['Lagos', 'Toronto', 'Vancouver', 'Remote'],
      required: true,
    },
    weekday: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    rsvpLink: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    eventType: {
      type: String,
      enum: ['Dining', 'Community', 'Nightlife', 'Creative', 'Wellness'],
      required: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isPast: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const Event = mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
