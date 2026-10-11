import { z } from 'zod';

export const MpVwLastKnownActivitySchema = z.object({
  Participant_ID: z.number().int(),
  Last_Known_Activity: z.string().regex(/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/, "Expected YYYY-MM-DD (optionally with a time)").nullable(),
});

export type MpVwLastKnownActivityInput = z.infer<typeof MpVwLastKnownActivitySchema>;
