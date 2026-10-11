import { z } from 'zod';

export const PersonnelBenefitsSchema = z.object({
  Personnel_Benefit_ID: z.number().int(),
  Personnel_ID: z.number().int(),
  Benefit_Type_ID: z.number().int(),
  Start_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Expiration_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Benefit_Notes: z.string().max(2000).nullable(),
});

export type PersonnelBenefitsInput = z.infer<typeof PersonnelBenefitsSchema>;
