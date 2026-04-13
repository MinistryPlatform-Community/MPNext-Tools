import { z } from 'zod';

export const ForgotPasswordLogSchema = z.object({
  Forgot_Password_Log_ID: z.number().int(),
  Forgot_Password_Log_Guid: z.string().uuid(),
  Server_Name: z.string().max(75),
  IP_Address: z.string().max(50),
  Email: z.string().max(100),
  First_Name: z.string().max(100),
  Time_Stamp: z.string().datetime(),
  Found_Contact: z.boolean(),
  Password_Recovered: z.boolean(),
  User_ID: z.number().int().nullable(),
  Return_Url: z.string().max(250).nullable(),
});

export type ForgotPasswordLogInput = z.infer<typeof ForgotPasswordLogSchema>;
