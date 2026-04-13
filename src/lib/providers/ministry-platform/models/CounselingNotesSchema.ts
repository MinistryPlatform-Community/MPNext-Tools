import { z } from 'zod';

export const CounselingNotesSchema = z.object({
  Counseling_Note_ID: z.number().int(),
  Counseling_Engagement_ID: z.number().int(),
  Made_By: z.number().int(),
  Counseling_Session_ID: z.number().int().nullable(),
  Homework: z.string().max(2000).nullable(),
  Counsel_Given: z.string().max(2000).nullable(),
  Scripture: z.string().max(2000).nullable(),
  Notes: z.string().max(2000).nullable(),
  Start_Date: z.string().datetime(),
});

export type CounselingNotesInput = z.infer<typeof CounselingNotesSchema>;
