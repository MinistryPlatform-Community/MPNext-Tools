import { z } from 'zod';

export const CounselingSessionsSchema = z.object({
  Counseling_Session_ID: z.number().int(),
  Counseling_Engagement_ID: z.number().int(),
  Session_Start_Date: z.string().datetime(),
  Session_End_Date: z.string().datetime(),
  Session_With: z.number().int(),
  Room_ID: z.number().int().nullable(),
  Counseling_Session_Type_ID: z.number().int(),
  Room_Approved: z.boolean(),
});

export type CounselingSessionsInput = z.infer<typeof CounselingSessionsSchema>;
