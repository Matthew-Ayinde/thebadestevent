import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  partnershipEmail: string;
  tagline: string;
  siteUrl: string;
  analyticsId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    partnershipEmail: {
      type: String,
      default: 'rinwahospitality@gmail.com',
    },
    tagline: {
      type: String,
      default: 'Come here, you\'ve arrived home',
    },
    siteUrl: {
      type: String,
      default: 'https://rinwa.com',
    },
    analyticsId: {
      type: String,
    },
  },
  { timestamps: true }
);

export const Settings = mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);
