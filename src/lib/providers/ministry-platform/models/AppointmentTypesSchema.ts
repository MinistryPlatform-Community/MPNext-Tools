import { z } from 'zod';

export const AppointmentTypesSchema = z.object({
  Appointment_Type_ID: z.number().int(),
  Appointment_Type: z.string().max(50),
});

export type AppointmentTypesInput = z.infer<typeof AppointmentTypesSchema>;
