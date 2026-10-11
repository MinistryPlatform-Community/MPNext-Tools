import { z } from 'zod';

export const ContactPrivateNotesSchema = z.object({
  Contact_Private_Note_ID: z.number().int(),
  User_ID: z.number().int(),
  Contact_ID: z.number().int().nullable(),
  Notes: z.string().max(2000),
  Start_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
});

export type ContactPrivateNotesInput = z.infer<typeof ContactPrivateNotesSchema>;
