import { z } from 'zod';

export const WeeklyChallengeAnswersSchema = z.object({
  Weekly_Challenge_Answer_ID: z.number().int(),
  Sermon_ID: z.number().int(),
  Start_Date: z.string().datetime(),
  Answer: z.string().max(4000),
  User_ID: z.number().int(),
  Ai_Score: z.number().nullable(),
  Ai_Points: z.number().int().nullable(),
});

export type WeeklyChallengeAnswersInput = z.infer<typeof WeeklyChallengeAnswersSchema>;
