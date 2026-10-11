import { z } from 'zod';

export const DpInboundSmsSchema = z.object({
  Inbound_SMS_ID: z.number().int(),
  Event_Time: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  Message_ID: z.string().max(64),
  Message_From: z.string().max(13),
  Message_To: z.string().max(1024),
  Message_Text: z.string().max(2048).nullable(),
  Contact_ID: z.number().int().nullable(),
  Last_Message_ID: z.number().int().nullable(),
});

export type DpInboundSmsInput = z.infer<typeof DpInboundSmsSchema>;
