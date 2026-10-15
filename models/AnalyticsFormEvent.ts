import mongoose, { Schema, Document } from 'mongoose';

// Questionnaire journey events. One "attempt" is one run through a form on
// one page load; steps are recorded the first time each is reached.
export interface IAnalyticsFormEvent extends Document {
  form: string;
  attemptId: string;
  visitorId: string;
  consent: boolean;
  action: string;
  step: number;
  message?: string;
  countryCode?: string;
  deviceType?: string;
  createdAt: Date;
}

const AnalyticsFormEventSchema = new Schema<IAnalyticsFormEvent>(
  {
    form: { type: String, required: true },
    attemptId: { type: String, required: true },
    visitorId: { type: String, required: true },
    consent: { type: Boolean, default: false },
    action: { type: String, required: true },
    step: { type: Number, default: 0 },
    message: String,
    countryCode: String,
    deviceType: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AnalyticsFormEventSchema.index({ form: 1, createdAt: -1 });
AnalyticsFormEventSchema.index({ visitorId: 1 });

export const AnalyticsFormEvent =
  mongoose.models.AnalyticsFormEvent ||
  mongoose.model<IAnalyticsFormEvent>('AnalyticsFormEvent', AnalyticsFormEventSchema);
