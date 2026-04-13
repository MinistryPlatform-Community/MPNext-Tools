import { z } from 'zod';

export const RecurringFrequenciesSchema = z.object({
  Recurring_Frequency_ID: z.number().int(),
  Recurring_Frequency: z.string().max(50),
  Add_Days: z.number().int(),
  Add_Month: z.number().int(),
  Add_Year: z.number().int(),
  Online_Sort_Order: z.number().int().nullable(),
});

export type RecurringFrequenciesInput = z.infer<typeof RecurringFrequenciesSchema>;
