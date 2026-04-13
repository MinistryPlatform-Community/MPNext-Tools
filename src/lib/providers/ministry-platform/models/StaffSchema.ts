import { z } from 'zod';

export const StaffSchema = z.object({
  Staff_ID: z.number().int(),
  Contact_ID: z.number().int(),
  Congregation_ID: z.number().int(),
  Staff_Email: z.string().email().max(254).nullable(),
  Spouse: z.string().max(50).nullable(),
  Staff_Type_ID: z.number().int(),
  Staff_Status_ID: z.number().int(),
  Title: z.string().max(100),
  Staff_Department: z.number().int(),
  Supervisor: z.number().int().nullable(),
  Start_Date: z.string().datetime(),
  End_Date: z.string().datetime().nullable(),
  Show_Online: z.boolean(),
  Show_On_Home: z.boolean(),
  Online_Order: z.number().int(),
  Facebook_Url: z.string().max(256).nullable(),
  Twitter_Url: z.string().max(256).nullable(),
  Pinterest_Url: z.string().max(256).nullable(),
});

export type StaffInput = z.infer<typeof StaffSchema>;
