import { z } from 'zod';

export const OpportunityTagsSchema = z.object({
  Opportunity_Tag_ID: z.number().int(),
  Opportunity_ID: z.number().int(),
  Tag_ID: z.number().int(),
});

export type OpportunityTagsInput = z.infer<typeof OpportunityTagsSchema>;
