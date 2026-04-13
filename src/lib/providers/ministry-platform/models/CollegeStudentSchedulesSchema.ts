import { z } from 'zod';

export const CollegeStudentSchedulesSchema = z.object({
  Student_Schedule_ID: z.number().int(),
  Student_ID: z.number().int(),
  Semester_Class_ID: z.number().int(),
  Grade_ID: z.number().int().nullable(),
  Payment_Status: z.number().int().nullable(),
  Notes: z.string().max(2147483647).nullable(),
  Student_Semester_ID: z.number().int().nullable(),
  Academic_Id_Number: z.number().int().nullable(),
  Student_Id_Number: z.number().int().nullable(),
  Class_Id_Number: z.number().int().nullable(),
  Audit: z.boolean(),
  PassFail: z.boolean(),
  Grade_Id_Number: z.number().int().nullable(),
});

export type CollegeStudentSchedulesInput = z.infer<typeof CollegeStudentSchedulesSchema>;
