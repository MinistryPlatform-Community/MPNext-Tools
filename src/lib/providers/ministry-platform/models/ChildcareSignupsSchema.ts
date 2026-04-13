import { z } from 'zod';

export const ChildcareSignupsSchema = z.object({
  Childcare_SignUp_ID: z.number().int(),
  Congregation_ID: z.number().int(),
  Meeting_Day_ID: z.number().int(),
  Parent_Group_Record: z.number().int(),
  Child: z.number().int(),
  Childcare_Start: z.string().datetime(),
  Childcare_End: z.string().datetime(),
  Start_Date: z.string().datetime(),
});

export type ChildcareSignupsInput = z.infer<typeof ChildcareSignupsSchema>;
