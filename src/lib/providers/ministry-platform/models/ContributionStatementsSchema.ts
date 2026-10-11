import { z } from 'zod';

export const ContributionStatementsSchema = z.object({
  Statement_ID: z.number().int(),
  Accounting_Company_ID: z.number().int(),
  Statement_Year: z.number().int(),
  Household_ID: z.number().int(),
  Statement_Type_ID: z.number().int(),
  Contact_Record: z.number().int().nullable(),
  Spouse_Record: z.number().int().nullable(),
  Salutation: z.string().max(254).nullable(),
  Archived: z.boolean(),
  Archived_Campaign: z.number().int().nullable(),
  Alternate_Archived_Campaign: z.number().int().nullable(),
  Last_Change_By_Routine: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  Last_Statement_File: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
});

export type ContributionStatementsInput = z.infer<typeof ContributionStatementsSchema>;
