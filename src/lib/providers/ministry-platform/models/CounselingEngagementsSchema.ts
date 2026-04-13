import { z } from 'zod';

export const CounselingEngagementsSchema = z.object({
  Counseling_Engagement_ID: z.number().int(),
  Counselee: z.number().int(),
  Counselor: z.number().int(),
  Encourager: z.number().int(),
  Congregation_ID: z.number().int(),
  Counseling_Status_ID: z.number().int(),
  Closing_Notes: z.string().max(2000).nullable(),
  Start_Date: z.string().datetime(),
  Last_Updated: z.string().datetime(),
  End_Date: z.string().datetime().nullable(),
  Counseling_Complete: z.boolean(),
  Encouragement_Complete: z.boolean(),
});

export type CounselingEngagementsInput = z.infer<typeof CounselingEngagementsSchema>;
