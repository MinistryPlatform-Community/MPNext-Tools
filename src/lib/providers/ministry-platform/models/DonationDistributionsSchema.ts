import { z } from 'zod';

export const DonationDistributionsSchema = z.object({
  Donation_Distribution_ID: z.number().int(),
  Donation_ID: z.number().int(),
  Amount: z.number(),
  Program_ID: z.number().int(),
  Pledge_ID: z.number().int().nullable(),
  Target_Event: z.number().int().nullable(),
  Soft_Credit_Donor: z.number().int().nullable(),
  Notes: z.string().max(1000).nullable(),
  Statement_Description: z.string().max(254).nullable(),
  Donation_Source_ID: z.number().int().nullable(),
  _Vendor_Pledge_Code: z.string().max(16).nullable(),
  Projected_Gift_Frequency: z.number().int().nullable(),
  _Last_Statement_Review: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Soft_Credit_Statement_ID: z.number().int().nullable(),
});

export type DonationDistributionsInput = z.infer<typeof DonationDistributionsSchema>;
