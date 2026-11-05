import { z } from 'zod';
import { AttendanceStatus } from '@prisma/client';

export const createAttendanceSchema = z.object({
  body: z.object({
    appointmentId: z.string().uuid({ message: 'Valid Appointment ID is required' }),
    sessionDate: z.string().datetime({ message: 'Valid ISO datetime string is required' }).optional(),
    status: z.nativeEnum(AttendanceStatus).optional(),
    therapistSigned: z.boolean().optional(),
    clientSigned: z.boolean().optional(),
  }),
});

export const updateAttendanceSchema = z.object({
  body: z.object({
    sessionDate: z.string().datetime({ message: 'Valid ISO datetime string is required' }).optional(),
    status: z.nativeEnum(AttendanceStatus).optional(),
    therapistSigned: z.boolean().optional(),
    clientSigned: z.boolean().optional(),
  }),
});
