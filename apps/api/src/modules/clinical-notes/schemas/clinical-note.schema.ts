import { z } from 'zod';

export const createClinicalNoteSchema = z.object({
  body: z.object({
    appointmentId: z.string().uuid({ message: 'Valid Appointment ID is required' }),
    notes: z.string().optional(),
    isApproved: z.boolean().optional(),
    therapistSigned: z.boolean().optional(),
    clientSigned: z.boolean().optional(),
  }),
});

export const updateClinicalNoteSchema = z.object({
  body: z.object({
    notes: z.string().optional(),
    isApproved: z.boolean().optional(),
    therapistSigned: z.boolean().optional(),
    clientSigned: z.boolean().optional(),
  }),
});
