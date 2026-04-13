import { z } from 'zod';

export const RecurringDonationsSchema = z.object({
  Recurring_Donation_ID: z.number().int(),
  Donor_ID: z.number().int(),
  Program_ID: z.number().int(),
  Start_Date: z.string().datetime(),
  End_Date: z.string().datetime(),
  Setup_Date: z.string().datetime(),
  Notes: z.string().max(250).nullable(),
  Recurring_Frequency_ID: z.number().int(),
  Last_Processed: z.string().datetime().nullable(),
  Next_Process_Date: z.string().datetime(),
  Donor_Payment_Profile_ID: z.number().int(),
  Amount: z.number(),
});

export type RecurringDonationsInput = z.infer<typeof RecurringDonationsSchema>;
