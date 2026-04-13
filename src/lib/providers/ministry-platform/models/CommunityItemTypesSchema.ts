import { z } from 'zod';

export const CommunityItemTypesSchema = z.object({
  Community_Item_Type_ID: z.number().int(),
  Community_Item_Type: z.string().max(50),
  Days_Active: z.number().int(),
});

export type CommunityItemTypesInput = z.infer<typeof CommunityItemTypesSchema>;
