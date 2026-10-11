import { z } from 'zod';

export const HouseholdCareLogSchema = z.object({
  Household_Care_ID: z.number().int(),
  Household_ID: z.number().int(),
  Care_Type_ID: z.number().int(),
  Care_Outcome_ID: z.number().int(),
  Date_Provided: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Provided_By: z.number().int(),
  Notes: z.string().max(2000).nullable(),
  Care_Amount: z.number().nullable(),
  Paid_To: z.number().int().nullable(),
  Care_Case_ID: z.number().int().nullable(),
  PRIVATE: z.boolean(),
  Contact_ID: z.number().int().nullable(),
  Completed: z.boolean(),
  Action_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
});

export type HouseholdCareLogInput = z.infer<typeof HouseholdCareLogSchema>;
