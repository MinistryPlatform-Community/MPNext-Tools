import { z } from 'zod';

export const groupWizardSchema = z.object({
  // Step 1: Identity
  Group_Name: z.string().min(1, 'Group name is required').max(75, 'Max 75 characters'),
  Group_Type_ID: z.number({ error: 'Group type is required' }).int(),
  Description: z.string().max(2000, 'Max 2000 characters').nullable().optional(),
  Start_Date: z.string().min(1, 'Start date is required'),
  End_Date: z.string().nullable().optional(),
  Reason_Ended: z.number().int().nullable().optional(),

  // Step 2: Organization & People
  Congregation_ID: z.number({ error: 'Congregation is required' }).int(),
  Ministry_ID: z.number({ error: 'Ministry is required' }).int(),
  Primary_Contact: z.number({ error: 'Primary contact is required' }).int(),
  Parent_Group: z.number().int().nullable().optional(),
  Priority_ID: z.number().int().nullable().optional(),

  // Step 3: Meeting Schedule
  Meeting_Day_ID: z.number().int().nullable().optional(),
  Meeting_Time: z.string().nullable().optional(),
  Meeting_Frequency_ID: z.number().int().nullable().optional(),
  Meeting_Duration_ID: z.number().int().nullable().optional(),
  Meets_Online: z.boolean(),
  Default_Meeting_Room: z.number().int().nullable().optional(),
  Offsite_Meeting_Address: z.number().int().nullable().optional(),

  // Step 4: Attributes
  Target_Size: z.number().int().positive('Must be a positive number').nullable().optional(),
  Life_Stage_ID: z.number().int().nullable().optional(),
  Group_Focus_ID: z.number().int().nullable().optional(),
  Required_Book: z.number().int().nullable().optional(),
  SMS_Number: z.number().int().nullable().optional(),
  Group_Is_Full: z.boolean(),

  // Step 5: Settings & Promotion
  Available_Online: z.boolean(),
  Available_On_App: z.boolean().nullable().optional(),
  Enable_Discussion: z.boolean(),
  Send_Attendance_Notification: z.boolean(),
  Send_Service_Notification: z.boolean(),
  Create_Next_Meeting: z.boolean(),
  'Secure_Check-in': z.boolean(),
  Suppress_Nametag: z.boolean(),
  Suppress_Care_Note: z.boolean(),
  On_Classroom_Manager: z.boolean(),
  Promote_to_Group: z.number().int().nullable().optional(),
  Age_in_Months_to_Promote: z.number().int().nullable().optional(),
  Promote_Weekly: z.boolean(),
  Promote_Participants_Only: z.boolean(),
  Promotion_Date: z.string().nullable().optional(),
  Descended_From: z.number().int().nullable().optional(),
});

export type GroupWizardFormData = z.infer<typeof groupWizardSchema>;

/** Field names for each wizard step, used for per-step validation via form.trigger() */
export const STEP_FIELDS: Record<number, (keyof GroupWizardFormData)[]> = {
  0: ['Group_Name', 'Group_Type_ID', 'Description', 'Start_Date', 'End_Date', 'Reason_Ended'],
  1: ['Congregation_ID', 'Ministry_ID', 'Primary_Contact', 'Parent_Group', 'Priority_ID'],
  2: ['Meeting_Day_ID', 'Meeting_Time', 'Meeting_Frequency_ID', 'Meeting_Duration_ID', 'Meets_Online', 'Default_Meeting_Room', 'Offsite_Meeting_Address'],
  3: ['Target_Size', 'Life_Stage_ID', 'Group_Focus_ID', 'Required_Book', 'SMS_Number', 'Group_Is_Full'],
  4: ['Available_Online', 'Available_On_App', 'Enable_Discussion', 'Send_Attendance_Notification', 'Send_Service_Notification', 'Create_Next_Meeting', 'Secure_Check-in' as keyof GroupWizardFormData, 'Suppress_Nametag', 'Suppress_Care_Note', 'On_Classroom_Manager', 'Promote_to_Group', 'Age_in_Months_to_Promote', 'Promote_Weekly', 'Promote_Participants_Only', 'Promotion_Date', 'Descended_From'],
  5: [], // Review step — no fields to validate
};

export const GROUP_WIZARD_DEFAULTS: GroupWizardFormData = {
  Group_Name: '',
  Group_Type_ID: undefined as unknown as number,
  Description: null,
  Start_Date: new Date().toISOString().split('T')[0],
  End_Date: null,
  Reason_Ended: null,
  Congregation_ID: undefined as unknown as number,
  Ministry_ID: undefined as unknown as number,
  Primary_Contact: undefined as unknown as number,
  Parent_Group: null,
  Priority_ID: null,
  Meeting_Day_ID: null,
  Meeting_Time: null,
  Meeting_Frequency_ID: null,
  Meeting_Duration_ID: null,
  Meets_Online: false,
  Default_Meeting_Room: null,
  Offsite_Meeting_Address: null,
  Target_Size: null,
  Life_Stage_ID: null,
  Group_Focus_ID: null,
  Required_Book: null,
  SMS_Number: null,
  Group_Is_Full: false,
  Available_Online: false,
  Available_On_App: null,
  Enable_Discussion: false,
  Send_Attendance_Notification: false,
  Send_Service_Notification: false,
  Create_Next_Meeting: false,
  'Secure_Check-in': false,
  Suppress_Nametag: false,
  Suppress_Care_Note: false,
  On_Classroom_Manager: false,
  Promote_to_Group: null,
  Age_in_Months_to_Promote: null,
  Promote_Weekly: false,
  Promote_Participants_Only: false,
  Promotion_Date: null,
  Descended_From: null,
};
