import { z } from 'zod';

export const ActionCampaignsSchema = z.object({
  Action_Campaign_ID: z.number().int(),
  Title: z.string().max(150),
  Body: z.string().max(2147483647).nullable(),
  Due_Date: z.string().datetime(),
  Follow_Up_Date: z.string().datetime().nullable(),
  Staff_Type_ID: z.number().int().nullable(),
  Group_ID: z.number().int().nullable(),
  Report_Contact: z.number().int().nullable(),
  Report_Group_ID: z.number().int().nullable(),
  Start_Date: z.string().datetime(),
  End_Date: z.string().datetime().nullable(),
});

export type ActionCampaignsInput = z.infer<typeof ActionCampaignsSchema>;
