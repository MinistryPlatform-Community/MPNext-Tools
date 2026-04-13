import { z } from 'zod';

export const ImportMicrSchema = z.object({
  DFIID: z.string().max(50).nullable(),
  DFIAcct: z.string().max(50).nullable(),
  NameCounter: z.string().max(50).nullable(),
  MICRCounter: z.string().max(50).nullable(),
  NAMICRLookupCounter: z.string().max(50).nullable(),
});

export type ImportMicrInput = z.infer<typeof ImportMicrSchema>;
