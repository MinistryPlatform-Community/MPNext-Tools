import { z } from 'zod';

export const DpCommunicationMessagesArchivedSchema = z.object({
  Communication_Message_Archived_ID: z.number().int(),
  Original_Communication_Message_ID: z.number().int(),
  Original_Communication_ID: z.number().int(),
  Action_Status_ID: z.number().int(),
  Action_Status_Time: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  Message_Sent_Time: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Action_Text: z.string().max(1024).nullable(),
  Contact_ID: z.number().int().nullable(),
  From: z.string().max(256),
  To: z.string().max(256),
  Reply_To: z.string().max(256).nullable(),
  Subject: z.string().max(1000).nullable(),
  Deleted: z.boolean(),
  _Date_Submitted: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  _Priority: z.number().int(),
  _Text_Segments: z.number().int().nullable(),
});

export type DpCommunicationMessagesArchivedInput = z.infer<typeof DpCommunicationMessagesArchivedSchema>;
