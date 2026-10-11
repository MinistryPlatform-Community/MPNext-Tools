import { z } from 'zod';

export const BooksSchema = z.object({
  Book_ID: z.number().int(),
  Title: z.string().max(150),
  ISBN: z.string().max(15).nullable(),
  Description: z.string().max(255).nullable(),
  Cost: z.number().nullable(),
  Start_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/, "Expected MP datetime YYYY-MM-DD HH:MM[:SS] (space or T, optional Z/offset)").nullable(),
  Genre_ID: z.number().int().nullable(),
});

export type BooksInput = z.infer<typeof BooksSchema>;
