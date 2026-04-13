import { z } from 'zod';

export const VwMpGivingUnitSummaryDonationsSchema = z.object({
  Donation_ID: z.number().int(),
  Donation_Distribution_ID: z.number().int(),
  Donation_Date: z.string().datetime(),
  Amount: z.number(),
  Payment_Type: z.string().max(50),
  Payment_Type_ID: z.number().int(),
  Is_Online: z.boolean(),
  Item_Number: z.string().max(15).nullable(),
  Fund_Name: z.string().max(50),
  Contact_ID: z.number().int(),
  Donor_ID: z.number().int(),
  Statement_Type_ID: z.number().int(),
  Statement_Frequency_ID: z.number().int(),
  Statement_Method_ID: z.number().int(),
  Statement_Header_ID: z.number().int(),
  Tax_Deductible_Donations: z.boolean(),
  Envelope_No: z.number().int().nullable(),
  Statement_Title: z.string().max(50),
  Household_ID: z.number().int().nullable(),
  Is_Soft_Credit: z.number().int(),
});

export type VwMpGivingUnitSummaryDonationsInput = z.infer<typeof VwMpGivingUnitSummaryDonationsSchema>;
