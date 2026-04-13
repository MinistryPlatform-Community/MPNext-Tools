import { z } from 'zod';

export const BibleBooksSchema = z.object({
  Bible_Book_ID: z.number().int(),
  Book: z.string().max(50),
  BookShort: z.string().max(50),
  Testament: z.string().max(50),
});

export type BibleBooksInput = z.infer<typeof BibleBooksSchema>;
