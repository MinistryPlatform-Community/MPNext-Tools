import { z } from 'zod';

export const DeploymentsSchema = z.object({
  Deployment_ID: z.number().int(),
  Deployment_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  Application_Code: z.string().max(16),
  Build_Version: z.string().max(16),
  Notes: z.string().max(255).nullable(),
});

export type DeploymentsInput = z.infer<typeof DeploymentsSchema>;
