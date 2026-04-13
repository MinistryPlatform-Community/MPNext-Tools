import { z } from 'zod';

// ============================================================
// Constants
// ============================================================

export const GROUP_TYPE_SMALL_GROUP = 1;

export const MEETING_TYPE_ONSITE = 1;
export const MEETING_TYPE_OFFSITE = 2;
export const MEETING_TYPE_ONLINE = 3;

export { CONGREGATIONS, GROUP_FOCUS_MEN, GROUP_FOCUS_WOMEN, GROUP_FOCUS_MEN_AND_WOMEN, GROUP_ROLE_LEADER } from '@/components/team-wizard/schemas';

export const MEETING_TYPE_OPTIONS = [
  { id: MEETING_TYPE_ONSITE, label: 'Onsite' },
  { id: MEETING_TYPE_OFFSITE, label: 'Offsite' },
  { id: MEETING_TYPE_ONLINE, label: 'Online' },
] as const;

export const CHILDREN_OPTIONS = [
  { value: 'no' as const, label: 'No Children' },
  { value: 'care' as const, label: 'Childcare Available' },
  { value: 'welcome' as const, label: 'Children Welcome' },
] as const;

// ============================================================
// Step Schemas
// ============================================================

export const stepBasicInfoSchema = z.object({
  groupName: z.string().min(5, 'Name must be at least 5 characters').max(75, 'Name must be 75 characters or less'),
  facebookGroup: z.string().max(64, 'Facebook URL must be 64 characters or less').optional().or(z.literal('')),
  targetSize: z.number().int().positive().optional(),
  description: z.string().min(50, 'Description must be at least 50 characters').max(1024, 'Description must be 1024 characters or less'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional().or(z.literal('')),
  meetingDayId: z.number({ message: 'Please select a meeting day' }),
  meetingFrequencyId: z.number({ message: 'Please select a meeting frequency' }),
  meetingTime: z.string().min(1, 'Meeting time is required'),
  meetingDurationId: z.number({ message: 'Please select a meeting duration' }),
});

export const offsiteAddressSchema = z.object({
  addressLine1: z.string().min(1, 'Address Line 1 is required').max(75),
  city: z.string().max(50).optional().or(z.literal('')),
  state: z.string().max(50).optional().or(z.literal('')),
  postalCode: z.string().max(15).optional().or(z.literal('')),
});

export const stepLocationDetailsSchema = z.object({
  congregationId: z.number({ message: 'Please select a campus' }),
  meetingTypeId: z.number({ message: 'Please select a meeting type' }),
  hybrid: z.boolean(),
  confidential: z.boolean(),
  defaultRoom: z.number().optional(),
  offsiteAddress: offsiteAddressSchema.optional(),
  children: z.enum(['no', 'care', 'welcome'], { message: 'Please select a children option' }),
  tagIds: z.array(z.number()),
});

export const stepMinistryRegistrationSchema = z.object({
  ministryId: z.number({ message: 'Please select a ministry' }),
  groupFocusId: z.number({ message: 'Please select a group focus' }),
  primaryContactId: z.number({ message: 'Please select a primary contact' }),
  hasRequiredBook: z.boolean(),
  requiredBookId: z.number().optional(),
  registrationStart: z.string().min(1, 'Registration start date is required'),
  registrationEnd: z.string().optional().or(z.literal('')),
  groupIsFull: z.boolean(),
});

export const groupWizardSchema = z.object({
  ...stepBasicInfoSchema.shape,
  ...stepLocationDetailsSchema.shape,
  ...stepMinistryRegistrationSchema.shape,
});

export type GroupWizardFormValues = z.infer<typeof groupWizardSchema>;

// ============================================================
// Step field lists (for per-step validation)
// ============================================================

export const STEP_BASIC_INFO_FIELDS: (keyof GroupWizardFormValues)[] = [
  'groupName',
  'facebookGroup',
  'targetSize',
  'description',
  'startDate',
  'endDate',
  'meetingDayId',
  'meetingFrequencyId',
  'meetingTime',
  'meetingDurationId',
];

export const STEP_LOCATION_DETAILS_FIELDS: (keyof GroupWizardFormValues)[] = [
  'congregationId',
  'meetingTypeId',
  'hybrid',
  'confidential',
  'defaultRoom',
  'offsiteAddress',
  'children',
  'tagIds',
];

export const STEP_MINISTRY_REGISTRATION_FIELDS: (keyof GroupWizardFormValues)[] = [
  'ministryId',
  'groupFocusId',
  'primaryContactId',
  'hasRequiredBook',
  'requiredBookId',
  'registrationStart',
  'registrationEnd',
  'groupIsFull',
];
