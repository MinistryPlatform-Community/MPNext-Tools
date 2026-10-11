import { z } from 'zod';

export const ContactRelationshipsSchema = z.object({
  Contact_Relationship_ID: z.number().int(),
  Contact_ID: z.number().int(),
  Relationship_ID: z.number().int(),
  Related_Contact_ID: z.number().int(),
  Start_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  End_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Notes: z.string().max(255).nullable(),
  _Triggered_By: z.number().int().nullable(),
});

export type ContactRelationshipsInput = z.infer<typeof ContactRelationshipsSchema>;
