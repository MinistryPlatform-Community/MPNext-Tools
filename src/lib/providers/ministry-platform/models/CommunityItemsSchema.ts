import { z } from 'zod';

export const CommunityItemsSchema = z.object({
  Community_Item_ID: z.number().int(),
  Community_Item_Type_ID: z.number().int(),
  Contact_ID: z.number().int(),
  Title: z.string().max(50).nullable(),
  Description: z.string().max(2147483647).nullable(),
  Start_Date: z.string().datetime().nullable(),
  End_Date: z.string().datetime().nullable(),
  Share_Phone: z.boolean().nullable(),
});

export type CommunityItemsInput = z.infer<typeof CommunityItemsSchema>;
