import { z } from 'zod';

export const BibleCollegePaymentTypesSchema = z.object({
  Bible_College_Payment_Type_ID: z.number().int(),
  Payment_Name: z.string().max(50),
});

export type BibleCollegePaymentTypesInput = z.infer<typeof BibleCollegePaymentTypesSchema>;
