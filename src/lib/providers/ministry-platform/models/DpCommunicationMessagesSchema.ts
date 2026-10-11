import { z } from 'zod';

export const DpCommunicationMessagesSchema = z.object({
  Communication_Message_ID: z.number().int(),
  Communication_ID: z.number().int(),
  Action_Status_ID: z.number().int(),
  Action_Status_Time: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  Action_Text: z.string().max(1024).nullable(),
  Contact_ID: z.number().int().nullable(),
  From: z.string().max(256),
  To: z.string().max(256),
  Reply_To: z.string().max(256).nullable(),
  Subject: z.string().max(500).nullable(),
  Body: z.string().max(2147483647).nullable(),
  Deleted: z.boolean(),
  _Date_Submitted: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  _Priority: z.number().int(),
  _Text_Segments: z.number().int().nullable(),
});

export type DpCommunicationMessagesInput = z.infer<typeof DpCommunicationMessagesSchema>;
