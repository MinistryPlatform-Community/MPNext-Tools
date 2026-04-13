import { z } from 'zod';

export const TrackingobjectsSchema = z.object({
  TrackingObject_ID: z.number().int(),
  Object_Type: z.string().max(50),
  Record_ID: z.number().int(),
  User_ID: z.number().int().nullable(),
  Tracking_GUID: z.string().max(50).nullable(),
  Start_Date: z.string().datetime(),
  Last_Updated: z.string().datetime(),
});

export type TrackingobjectsInput = z.infer<typeof TrackingobjectsSchema>;
