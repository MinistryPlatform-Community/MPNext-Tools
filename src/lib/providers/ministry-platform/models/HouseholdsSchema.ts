import { z } from 'zod';

export const HouseholdsSchema = z.object({
  Household_ID: z.number().int(),
  Household_Name: z.string().max(75),
  Address_ID: z.number().int().nullable(),
  Home_Phone: z.string().nullable(),
  Congregation_ID: z.number().int().nullable(),
  Care_Person: z.number().int().nullable(),
  Household_Source_ID: z.number().int().nullable(),
  Family_Call_Number: z.number().int().nullable(),
  Home_Phone_Unlisted: z.boolean(),
  Home_Address_Unlisted: z.boolean(),
  Bulk_Mail_Opt_Out: z.boolean(),
  _First_Donation: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  _Last_Donation: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  _Last_Activity: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Alternate_Mailing_Address: z.number().int().nullable(),
  Season_Start: z.string().regex(/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/, "Expected YYYY-MM-DD (optionally with a time)").nullable(),
  Season_End: z.string().regex(/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/, "Expected YYYY-MM-DD (optionally with a time)").nullable(),
  Repeats_Annually: z.boolean(),
  Driving_Distance: z.number().nullable(),
  Driving_Time: z.number().nullable(),
});

export type HouseholdsInput = z.infer<typeof HouseholdsSchema>;
