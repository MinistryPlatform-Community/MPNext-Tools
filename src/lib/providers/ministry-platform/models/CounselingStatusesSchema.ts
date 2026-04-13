import { z } from 'zod';

export const CounselingStatusesSchema = z.object({
  Counseling_Status_ID: z.number().int(),
  Counseling_Status: z.string().max(128),
});

export type CounselingStatusesInput = z.infer<typeof CounselingStatusesSchema>;
