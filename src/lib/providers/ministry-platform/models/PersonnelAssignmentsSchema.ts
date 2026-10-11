import { z } from 'zod';

export const PersonnelAssignmentsSchema = z.object({
  Personnel_Assignment_ID: z.number().int(),
  Personnel_ID: z.number().int(),
  Personnel_Assignment_Type_ID: z.number().int(),
  Location_ID: z.number().int().nullable(),
  Assignment_Role_ID: z.number().int().nullable(),
  Assignment_Start: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Assignment_End: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Primary_Assignment: z.boolean(),
  Assignment_Comments: z.string().max(2000).nullable(),
  Mail_To_Location: z.boolean().nullable(),
  Contract_Signed: z.boolean().nullable(),
  Hours_Per_Week: z.number().int().nullable(),
  Hourly_Rate: z.number().nullable(),
  Annual_Salary: z.number().nullable(),
  Vacation_Hours: z.number().int().nullable(),
});

export type PersonnelAssignmentsInput = z.infer<typeof PersonnelAssignmentsSchema>;
