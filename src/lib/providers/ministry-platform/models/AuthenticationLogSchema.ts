import { z } from 'zod';

export const AuthenticationLogSchema = z.object({
  Authentication_Log_ID: z.number().int(),
  User_Name: z.string().max(254),
  Server_Name: z.string().max(75),
  IP_Address: z.string().max(50),
  Date_Time: z.string().datetime(),
  User_ID: z.number().int().nullable(),
  Success: z.boolean(),
});

export type AuthenticationLogInput = z.infer<typeof AuthenticationLogSchema>;
