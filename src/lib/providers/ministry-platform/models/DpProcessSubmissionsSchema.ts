import { z } from 'zod';

export const DpProcessSubmissionsSchema = z.object({
  Process_Submission_ID: z.number().int(),
  Submitted_By: z.number().int(),
  Date_Submitted: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  Process_ID: z.number().int(),
  Process_Submission_Status_ID: z.number().int(),
  _Record_ID: z.number().int(),
});

export type DpProcessSubmissionsInput = z.infer<typeof DpProcessSubmissionsSchema>;
