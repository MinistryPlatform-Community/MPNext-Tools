import { z } from 'zod';

export const CcmSecurityIssuesSchema = z.object({
  CCM_Security_Issue_ID: z.number().int(),
  Contact_ID: z.number().int().nullable(),
  Security_Issue_Type_ID: z.number().int().nullable(),
  Start_Date: z.string().datetime(),
  Situation: z.string().max(2147483647).nullable(),
  Recommendations: z.string().max(2147483647).nullable(),
  Resolution_Date: z.string().datetime().nullable(),
});

export type CcmSecurityIssuesInput = z.infer<typeof CcmSecurityIssuesSchema>;
