import { z } from 'zod';

export const SmwSignupsSchema = z.object({
  SMW_SignUp_ID: z.number().int(),
  User_ID: z.number().int().nullable(),
  Contact_ID: z.number().int(),
  Start_Date: z.string().datetime(),
  Communication_Type: z.number().int(),
  Days_On_Same_MileStone: z.number().int(),
  Completed: z.boolean(),
  Cancelled: z.boolean(),
});

export type SmwSignupsInput = z.infer<typeof SmwSignupsSchema>;
