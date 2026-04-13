import { z } from 'zod';

export const SignUpLogSchema = z.object({
  Sign_Up_Attempt_ID: z.number().int(),
  Sign_Up_Attempt_Guid: z.string().uuid(),
  Server_Name: z.string().max(75),
  IP_Address: z.string().max(50),
  First_Name: z.string().max(100),
  Last_Name: z.string().max(100),
  Email: z.string().max(100),
  Mobile_Phone: z.string().max(50).nullable(),
  Birth_Date: z.string().datetime(),
  Gender_ID: z.number().int().nullable(),
  Return_Url: z.string().max(250).nullable(),
  Create_Contact: z.boolean(),
  Create_Household: z.boolean(),
  Create_Participant: z.boolean(),
  Create_User: z.boolean(),
  Contact_ID: z.number().int().nullable(),
  Time_Stamp: z.string().datetime(),
  Has_Signed_Up: z.boolean(),
  User_Found: z.boolean(),
});

export type SignUpLogInput = z.infer<typeof SignUpLogSchema>;
