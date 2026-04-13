import { z } from 'zod';

// ============================================================
// Constants
// ============================================================

export const GROUP_TYPE_MINISTRY_TEAM = 2;
export const GROUP_TYPE_MISSION_TRIP = 6;
export const GROUP_TYPE_QUICK_SERVE = 12;
export const GROUP_TYPE_COMMUNICATION = 13;

export const GROUP_FOCUS_MEN = 6;
export const GROUP_FOCUS_WOMEN = 7;
export const GROUP_FOCUS_MEN_AND_WOMEN = 24;

export const CONGREGATIONS = [
  { id: 5, name: 'Melbourne' },
  { id: 6, name: 'Viera' },
  { id: 7, name: 'Sebastian' },
  { id: 15, name: 'Espanol' },
] as const;

export const GROUP_TYPE_OPTIONS = [
  { id: GROUP_TYPE_MINISTRY_TEAM, label: 'Ministry Team' },
  { id: GROUP_TYPE_MISSION_TRIP, label: 'Mission Trip Team' },
  { id: GROUP_TYPE_QUICK_SERVE, label: 'Quick Serve' },
  { id: GROUP_TYPE_COMMUNICATION, label: 'Communication Group' },
] as const;

/** Valid Group_Type_IDs for Team Wizard */
export const TEAM_WIZARD_GROUP_TYPE_IDS = new Set(
  GROUP_TYPE_OPTIONS.map((o) => o.id)
);

/** Group Role ID for "Leader" in Group_Roles table */
export const GROUP_ROLE_LEADER = 7;

// ============================================================
// Step Schemas
// ============================================================

export const stepBasicInfoSchema = z.object({
  groupName: z.string().min(5, 'Name must be at least 5 characters').max(75, 'Name must be 75 characters or less'),
  groupTypeId: z.number({ message: 'Please select a group type' }),
  description: z.string().max(1024, 'Description must be 1024 characters or less')
    .refine(
      (val) => val.length === 0 || val.length >= 50,
      { message: 'Description must be empty or at least 50 characters' }
    ),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  maxSize: z.number().int().positive().optional(),
});

export const stepMinistryCampusSchema = z.object({
  congregationId: z.number({ message: 'Please select a campus' }),
  ministryId: z.number({ message: 'Please select a ministry' }),
  groupFocusId: z.number().optional(),
  primaryContactId: z.number({ message: 'Please select a primary contact' }),
  tagIds: z.array(z.number()),
});

export const offsiteAddressSchema = z.object({
  addressLine1: z.string().min(1, 'Address Line 1 is required').max(75),
  addressLine2: z.string().max(75).optional(),
  city: z.string().max(50).optional(),
  state: z.string().max(50).optional(),
  postalCode: z.string().max(15).optional(),
});

export const stepRegistrationSchema = z.object({
  registrationStart: z.string().min(1, 'Registration start date is required'),
  registrationEnd: z.string().optional(),
  meetingLocationOnCampus: z.boolean(),
  offsiteAddress: offsiteAddressSchema.optional(),
});

export const teamWizardSchema = z.object({
  ...stepBasicInfoSchema.shape,
  ...stepMinistryCampusSchema.shape,
  registrationStart: z.string().optional(),
  registrationEnd: z.string().optional(),
  meetingLocationOnCampus: z.boolean(),
  offsiteAddress: offsiteAddressSchema.optional(),
});

export type TeamWizardFormValues = z.infer<typeof teamWizardSchema>;

// ============================================================
// Step field lists (for per-step validation)
// ============================================================

export const STEP_BASIC_INFO_FIELDS: (keyof TeamWizardFormValues)[] = [
  'groupName',
  'groupTypeId',
  'description',
  'startDate',
  'endDate',
  'maxSize',
];

export const STEP_MINISTRY_CAMPUS_FIELDS: (keyof TeamWizardFormValues)[] = [
  'congregationId',
  'ministryId',
  'groupFocusId',
  'primaryContactId',
  'tagIds',
];

export const STEP_REGISTRATION_FIELDS: (keyof TeamWizardFormValues)[] = [
  'registrationStart',
  'registrationEnd',
  'meetingLocationOnCampus',
  'offsiteAddress',
];
