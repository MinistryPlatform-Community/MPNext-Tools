import { z } from 'zod';

export const DevoSchema = z.object({
  Devo_ID: z.number().int(),
  Title: z.string().max(150),
  Start_Date: z.string().datetime(),
  End_Date: z.string().datetime().nullable(),
  Devo: z.string().max(2147483647).nullable(),
  SMS_Devo: z.string().max(150).nullable(),
  Sermon_ID: z.number().int().nullable(),
  Contact_ID: z.number().int().nullable(),
  Approved: z.boolean(),
  Spanish_Title: z.string().max(150).nullable(),
  Spanish_Devo: z.string().max(2147483647).nullable(),
  Audio_Devo_Url: z.string().max(512).nullable(),
});

export type DevoInput = z.infer<typeof DevoSchema>;
