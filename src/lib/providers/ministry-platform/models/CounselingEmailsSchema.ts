import { z } from 'zod';

export const CounselingEmailsSchema = z.object({
  Counseling_Email_ID: z.number().int(),
  Counseling_Engagement_ID: z.number().int(),
  From_Address: z.string().max(128),
  From_Contact: z.number().int().nullable(),
  To_Address: z.string().max(128),
  To_Contact: z.number().int().nullable(),
  Subject: z.string().max(50),
  Body: z.string().max(2147483647).nullable(),
  Start_Date: z.string().datetime(),
});

export type CounselingEmailsInput = z.infer<typeof CounselingEmailsSchema>;
