import { z } from 'zod';

export const ContactLogSchema = z.object({
  Contact_Log_ID: z.number().int(),
  Contact_ID: z.number().int(),
  Contact_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  Contact_Log_Type_ID: z.number().int().nullable(),
  Made_By: z.number().int(),
  Notes: z.string().max(2000),
  Planned_Contact_ID: z.number().int().nullable(),
  Contact_Successful: z.boolean().nullable(),
  Original_Contact_Log_Entry: z.number().int().nullable(),
  Feedback_Entry_ID: z.number().int().nullable(),
});

export type ContactLogInput = z.infer<typeof ContactLogSchema>;
