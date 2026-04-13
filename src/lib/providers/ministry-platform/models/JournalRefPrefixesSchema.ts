import { z } from 'zod';

export const JournalRefPrefixesSchema = z.object({
  Journal_Ref_Prefix_ID: z.number().int(),
  Journal_Ref_Prefix_Name: z.string().max(50),
  Journal_Ref_Prefix_Code: z.string().max(16),
});

export type JournalRefPrefixesInput = z.infer<typeof JournalRefPrefixesSchema>;
