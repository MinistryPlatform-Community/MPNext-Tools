import { z } from 'zod';

export const CongregantNotesSchema = z.object({
  Congregant_Note_ID: z.number().int(),
  User_ID: z.number().int(),
  Start_Date: z.string().datetime(),
  Last_Updated: z.string().datetime(),
  Notes: z.string().max(2147483647).nullable(),
  Sermon_ID: z.number().int(),
});

export type CongregantNotesInput = z.infer<typeof CongregantNotesSchema>;
