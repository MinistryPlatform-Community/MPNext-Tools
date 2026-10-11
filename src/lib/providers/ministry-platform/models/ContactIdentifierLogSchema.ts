import { z } from 'zod';

export const ContactIdentifierLogSchema = z.object({
  Contact_Identifier_ID: z.number().int(),
  Contact_ID: z.number().int(),
  Source_System_Name: z.string().max(50),
  Source_Type_Name: z.string().max(128),
  Identifier_Value: z.string().max(4000),
  _Date_Inserted: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
});

export type ContactIdentifierLogInput = z.infer<typeof ContactIdentifierLogSchema>;
