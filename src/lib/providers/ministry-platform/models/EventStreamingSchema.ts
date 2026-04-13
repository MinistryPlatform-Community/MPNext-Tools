import { z } from 'zod';

export const EventStreamingSchema = z.object({
  Event_Streaming_ID: z.number().int(),
  Title: z.string().max(50),
  Start_Date: z.string().datetime(),
  End_Date: z.string().datetime(),
});

export type EventStreamingInput = z.infer<typeof EventStreamingSchema>;
