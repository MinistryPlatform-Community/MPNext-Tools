import { z } from 'zod';

export const AltarcallLogSchema = z.object({
  AltarCall_Log_ID: z.number().int(),
  CallSid: z.string().max(50),
  Caller: z.string().max(50),
  Contact_ID: z.number().int().nullable(),
  Call_Started: z.string().datetime(),
  Call_Ended: z.string().datetime().nullable(),
  Hold_Count: z.number().int(),
  Agent: z.number().int().nullable(),
  Status: z.string().max(50).nullable(),
  RecordingUrl: z.string().max(256).nullable(),
  RecordingText: z.string().max(2048).nullable(),
  RequiresFollowUp: z.boolean(),
});

export type AltarcallLogInput = z.infer<typeof AltarcallLogSchema>;
