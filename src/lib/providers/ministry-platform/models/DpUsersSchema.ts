import { z } from 'zod';

export const DpUsersSchema = z.object({
  User_ID: z.number().int(),
  User_Name: z.string().max(254),
  User_Email: z.string().max(254).nullable(),
  Display_Name: z.string().max(75).nullable(),
  Password: z.unknown().nullable(),
  Admin: z.boolean(),
  Publications_Manager: z.boolean(),
  Contact_ID: z.number().int(),
  Supervisor: z.number().int().nullable(),
  User_GUID: z.string().uuid(),
  Can_Impersonate: z.boolean(),
  FaceBookID: z.number().int().nullable(),
  Is_Approved: z.boolean().nullable(),
  Last_Login_Date: z.string().datetime().nullable(),
  Failed_Login_Attempt_Count: z.number().int().nullable(),
  Failed_Login_Last_Date: z.string().datetime().nullable(),
  In_Recovery: z.boolean().nullable(),
  Read_Permitted: z.boolean(),
  Create_Permitted: z.boolean(),
  Update_Permitted: z.boolean(),
  Delete_Permitted: z.boolean(),
  Time_Zone: z.unknown().nullable(),
  Locale: z.unknown().nullable(),
  Theme: z.string().max(32).nullable(),
  Setup_Admin: z.boolean(),
  Recovery_Code: z.string().max(10).nullable(),
  Login_Attempts: z.number().int(),
  MFA_Required: z.boolean().nullable(),
});

export type DpUsersInput = z.infer<typeof DpUsersSchema>;
