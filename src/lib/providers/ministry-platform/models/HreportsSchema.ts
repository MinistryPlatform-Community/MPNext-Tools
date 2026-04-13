import { z } from 'zod';

export const HreportsSchema = z.object({
  hReport_ID: z.number().int(),
  Title: z.string().max(100),
  Description: z.string().max(255).nullable(),
  Field_Mapping: z.string().max(512).nullable(),
  Stored_Procedure: z.string().max(192).nullable(),
  ReportHTML: z.string().max(2147483647).nullable(),
  Report_Active: z.boolean().nullable(),
  Start_Date: z.string().datetime(),
  Report_GUID: z.string().uuid(),
});

export type HreportsInput = z.infer<typeof HreportsSchema>;
