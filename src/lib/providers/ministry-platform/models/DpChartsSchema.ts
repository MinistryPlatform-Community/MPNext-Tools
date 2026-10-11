import { z } from 'zod';

export const DpChartsSchema = z.object({
  Chart_ID: z.number().int(),
  Page_ID: z.number().int(),
  Chart_Name: z.string().max(50),
  Label_Field: z.string().max(2000),
  Data_Field: z.string().max(2000),
  Sort_Field: z.string().max(256).nullable(),
  Aggregation_Type_ID: z.number().int(),
  Default_Chart_Type_ID: z.number().int(),
  Position: z.number().int(),
  Active: z.boolean(),
  Cache_Minutes: z.number().int(),
});

export type DpChartsInput = z.infer<typeof DpChartsSchema>;
