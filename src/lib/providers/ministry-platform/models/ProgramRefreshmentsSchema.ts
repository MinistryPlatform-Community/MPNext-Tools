import { z } from 'zod';

export const ProgramRefreshmentsSchema = z.object({
  Program_Refreshment_ID: z.number().int(),
  Program_ID: z.number().int(),
  Requestor: z.number().int(),
  Date: z.string().datetime(),
  Amount: z.number(),
  Location: z.string().max(250),
  Purpose: z.string().max(512),
  People_Attending: z.number().int(),
});

export type ProgramRefreshmentsInput = z.infer<typeof ProgramRefreshmentsSchema>;
