import { z } from 'zod';

export const DiscipleshipSchema = z.object({
  Discipleship_ID: z.number().int(),
  Contact_ID: z.number().int(),
  Congregation_ID: z.number().int(),
  Date_Of_Birth: z.string().datetime(),
  Gender_ID: z.number().int(),
  Marital_Status_ID: z.number().int(),
  Meet_In_Person: z.boolean(),
  Occupation: z.string().max(128).nullable(),
  Status_ID: z.number().int(),
  Mentor: z.number().int().nullable(),
  Start_Date: z.string().datetime(),
  End_Date: z.string().datetime().nullable(),
  Notes: z.string().max(2147483647).nullable(),
  Mentor_Assigned: z.string().datetime().nullable(),
  Mentor_Confirmed: z.string().datetime().nullable(),
});

export type DiscipleshipInput = z.infer<typeof DiscipleshipSchema>;
