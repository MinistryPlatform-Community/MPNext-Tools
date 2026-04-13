import { z } from 'zod';

export const VwBiMonthlystatsSchema = z.object({
  New_Contacts: z.number().int().nullable(),
  New_Donors: z.number().int().nullable(),
  Engaged_People: z.number().int().nullable(),
  Total_People: z.number().int().nullable(),
  New_Salvations: z.number().int().nullable(),
  Rededications: z.number().int().nullable(),
  Active_Small_Groups: z.number().int().nullable(),
  Group_Members: z.number().int().nullable(),
  Total_Checkins: z.number().int().nullable(),
  Unique_Checkins: z.number().int().nullable(),
  Active_Teams: z.number().int().nullable(),
  Volunteers: z.number().int().nullable(),
});

export type VwBiMonthlystatsInput = z.infer<typeof VwBiMonthlystatsSchema>;
