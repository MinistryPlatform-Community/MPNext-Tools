import { z } from 'zod';

export const ScheduledDonationsSchema = z.object({
  Scheduled_Donation_ID: z.number().int(),
  Donor_ID: z.number().int(),
  Donor_Account_ID: z.number().int().nullable(),
  Day_of_Month: z.unknown(),
  Amount: z.number(),
  Start_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  End_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Target_Event: z.number().int().nullable(),
  Notes: z.string().max(1000).nullable(),
  Payment_Type_ID: z.number().int(),
  Gift_Frequency_ID: z.number().int(),
  Number_Of_Installments: z.number().int().nullable(),
  Day_of_Month_2: z.unknown().nullable(),
  Third_Party_Note: z.string().max(1000).nullable(),
  Congregation_ID: z.number().int().nullable(),
  Memorized_Batch_ID: z.number().int().nullable(),
});

export type ScheduledDonationsInput = z.infer<typeof ScheduledDonationsSchema>;
