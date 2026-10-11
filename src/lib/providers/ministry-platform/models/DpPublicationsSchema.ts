import { z } from 'zod';

export const DpPublicationsSchema = z.object({
  Publication_ID: z.number().int(),
  Title: z.string().max(50),
  Congregation_ID: z.number().int().nullable(),
  Description: z.string().max(255).nullable(),
  Moderator: z.number().int().nullable(),
  Available_Online: z.boolean().nullable(),
  Online_Sort_Order: z.number().int().nullable(),
  MailChimp_List: z.string().max(50).nullable(),
  Last_Sync_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Sync_Nightly: z.boolean(),
  Name: z.string().max(25),
  On_Connection_Card: z.boolean(),
});

export type DpPublicationsInput = z.infer<typeof DpPublicationsSchema>;
