import { z } from 'zod';

export const StaffDepartmentsSchema = z.object({
  Staff_Department_ID: z.number().int(),
  Department: z.string().max(50),
});

export type StaffDepartmentsInput = z.infer<typeof StaffDepartmentsSchema>;
