import { z } from 'zod';

export const DeploymentLogsSchema = z.object({
  Log_ID: z.number().int(),
  Log_Title: z.string().max(128),
  Log_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)"),
  Log_Content: z.string().max(2147483647).nullable(),
  Log_Code: z.number().int().nullable(),
  Deployment_ID: z.number().int().nullable(),
});

export type DeploymentLogsInput = z.infer<typeof DeploymentLogsSchema>;
