import { z } from 'zod';

export const VolunteerUnavailableDatesSchema = z.object({
  Volunteer_Unavailable_Date_ID: z.number().int(),
  Contact_ID: z.number().int(),
  Start_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/, "Expected YYYY-MM-DD (optionally with a time)"),
  End_Date: z.string().regex(/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/, "Expected YYYY-MM-DD (optionally with a time)"),
});

export type VolunteerUnavailableDatesInput = z.infer<typeof VolunteerUnavailableDatesSchema>;
