import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestionnaireSubmission extends Document {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  eventName?: string;
  eventPurpose?: string;
  objectives?: string;
  eventDate?: string;
  hostCity?: string;
  venueLocation?: string;
  eventHashtags?: string[];
  eventFormat?: string;
  attendeeCount?: string;
  targetAudience?: string;
  responsibilities?: string;
  managingScope?: string;
  existingVendors?: string;
  existingVendorDetails?: string;
  internalTeam?: string;
  internalTeamDetails?: string;
  venueSecured?: string;
  venuePreferences?: string;
  requiredSpaces?: string[];
  productionNeeds?: string[];
  specialProduction?: string;
  registrationMethod?: string;
  ticketingSupport?: string;
  vipGuests?: string;
  vipDetails?: string;
  accessibilityRequired?: string;
  accessibilityDetails?: string;
  guestTouchpoints?: string;
  speakerCount?: string;
  travelCoordination?: string;
  speakerManagement?: string;
  staffingRequired?: string;
  volunteersNeeded?: string;
  staffingRecruitment?: string;
  cateringProvided?: string;
  serviceStyle?: string[];
  dietaryRequirements?: string;
  attendeeCommunications?: string;
  marketingManagement?: string;
  eventMaterials?: string[];
  transportationRequired?: string;
  hotelBlocks?: string;
  airportTransfers?: string;
  sponsorsInvolved?: string;
  sponsorDeliverables?: string;
  exhibitorActivations?: string;
  eventInsurance?: string;
  permitsRequired?: string;
  securityRequired?: string;
  contingencyPlans?: string;
  budgetRange?: string;
  budgetConstraints?: string;
  decisionMakers?: string;
  procurementProcess?: string;
  planningStart?: string;
  majorMilestones?: string;
  postEventReporting?: string;
  successDefinition?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const str = { type: String };
const arr = { type: [String], default: [] };

const QuestionnaireSubmissionSchema = new Schema<IQuestionnaireSubmission>(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    company: { type: String, required: true },
    eventName: str,
    eventPurpose: str,
    objectives: str,
    eventDate: str,
    hostCity: str,
    venueLocation: str,
    eventHashtags: arr,
    eventFormat: str,
    attendeeCount: str,
    targetAudience: str,
    responsibilities: str,
    managingScope: str,
    existingVendors: str,
    existingVendorDetails: str,
    internalTeam: str,
    internalTeamDetails: str,
    venueSecured: str,
    venuePreferences: str,
    requiredSpaces: arr,
    productionNeeds: arr,
    specialProduction: str,
    registrationMethod: str,
    ticketingSupport: str,
    vipGuests: str,
    vipDetails: str,
    accessibilityRequired: str,
    accessibilityDetails: str,
    guestTouchpoints: str,
    speakerCount: str,
    travelCoordination: str,
    speakerManagement: str,
    staffingRequired: str,
    volunteersNeeded: str,
    staffingRecruitment: str,
    cateringProvided: str,
    serviceStyle: arr,
    dietaryRequirements: str,
    attendeeCommunications: str,
    marketingManagement: str,
    eventMaterials: arr,
    transportationRequired: str,
    hotelBlocks: str,
    airportTransfers: str,
    sponsorsInvolved: str,
    sponsorDeliverables: str,
    exhibitorActivations: str,
    eventInsurance: str,
    permitsRequired: str,
    securityRequired: str,
    contingencyPlans: str,
    budgetRange: str,
    budgetConstraints: str,
    decisionMakers: str,
    procurementProcess: str,
    planningStart: str,
    majorMilestones: str,
    postEventReporting: str,
    successDefinition: str,
    status: { type: String, default: 'new' },
  },
  { timestamps: true }
);

export const QuestionnaireSubmission =
  mongoose.models.QuestionnaireSubmission ||
  mongoose.model<IQuestionnaireSubmission>('QuestionnaireSubmission', QuestionnaireSubmissionSchema);
