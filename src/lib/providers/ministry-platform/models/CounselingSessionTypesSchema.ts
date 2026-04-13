import { z } from 'zod';

export const CounselingSessionTypesSchema = z.object({
  Counseling_Session_Type_ID: z.number().int(),
  Counseling_Session_Type: z.string().max(50),
});

export type CounselingSessionTypesInput = z.infer<typeof CounselingSessionTypesSchema>;
