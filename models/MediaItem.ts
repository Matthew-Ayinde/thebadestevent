import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMediaItem extends Document {
  imageUrl: string;
  caption?: string;
  eventId?: Types.ObjectId;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MediaItemSchema = new Schema<IMediaItem>(
  {
    imageUrl: {
      type: String,
      required: true,
    },
    caption: {
      type: String,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const MediaItem = mongoose.models.MediaItem || mongoose.model<IMediaItem>('MediaItem', MediaItemSchema);
