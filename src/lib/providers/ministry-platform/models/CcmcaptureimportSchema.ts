import { z } from 'zod';

export const CcmcaptureimportSchema = z.object({
  Import_ID: z.number().int(),
  MomName: z.string().max(255).nullable(),
  MomEmail: z.string().max(255).nullable(),
  Address: z.string().max(255).nullable(),
  City: z.string().max(255).nullable(),
  Zip: z.number().nullable(),
  Contact_ID: z.number().int().nullable(),
  Household_ID: z.number().int().nullable(),
  Daughter1: z.string().max(255).nullable(),
  Daughter1Group: z.string().max(255).nullable(),
  Daughter2: z.string().max(255).nullable(),
  Daughter2Group: z.string().max(255).nullable(),
});

export type CcmcaptureimportInput = z.infer<typeof CcmcaptureimportSchema>;
