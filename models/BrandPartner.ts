import mongoose, { Schema, Document } from 'mongoose';

export interface IBrandPartner extends Document {
  name: string;
  logoUrl: string;
  region: 'Lagos' | 'Canada' | 'Hospitality' | 'Other';
  link?: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BrandPartnerSchema = new Schema<IBrandPartner>(
  {
    name: {
      type: String,
      required: true,
    },
    logoUrl: {
      type: String,
      required: true,
    },
    region: {
      type: String,
      enum: ['Lagos', 'Canada', 'Hospitality', 'Other'],
      required: true,
    },
    link: {
      type: String,
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

export const BrandPartner = mongoose.models.BrandPartner || mongoose.model<IBrandPartner>('BrandPartner', BrandPartnerSchema);
