import { z } from 'zod';

export const MinistryPartnersSchema = z.object({
  Ministry_Partner_ID: z.number().int(),
  Ministry_Partner: z.string().max(150),
  Description: z.string().max(512).nullable(),
  Website: z.string().max(256).nullable(),
  Show_Online: z.boolean(),
  Feature_On_Campus: z.boolean(),
});

export type MinistryPartnersInput = z.infer<typeof MinistryPartnersSchema>;
