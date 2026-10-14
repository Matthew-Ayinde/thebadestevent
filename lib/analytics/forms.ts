// The multi-step questionnaires whose journeys are tracked. Shared by the
// public form hook, the collect endpoint and the admin dashboard.

export const FORM_IDS = ['guest', 'homecoming'] as const;
export type FormId = (typeof FORM_IDS)[number];

export const FORM_ACTIONS = ['start', 'step', 'error', 'submit', 'submit_error'] as const;
export type FormAction = (typeof FORM_ACTIONS)[number];

export interface FormConfig {
  id: FormId;
  label: string;
  path: string;
  /** Step names, in order; step numbers are 1-based. */
  steps: string[];
}

export const FORMS: Record<FormId, FormConfig> = {
  guest: {
    id: 'guest',
    label: 'Guest check-in',
    path: '/ourguests',
    steps: ['First impressions', 'The little things', 'Feeling cared for', 'The honest part', 'Would come back'],
  },
  homecoming: {
    id: 'homecoming',
    label: 'Homecoming',
    path: '/ourdiaspora',
    steps: ['About you', 'Your trip', 'What you need', 'Perks'],
  },
};

export function isFormId(value: string | null | undefined): value is FormId {
  return !!value && (FORM_IDS as readonly string[]).includes(value);
}
