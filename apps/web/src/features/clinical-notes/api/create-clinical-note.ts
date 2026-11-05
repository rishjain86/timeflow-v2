import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export interface CreateClinicalNotePayload {
  appointmentId: string;
  clientId: string;
  content: string; // The main SOAP/Progress note content
  interventions?: string;
  progress?: 'IMPROVING' | 'MAINTAINING' | 'DECLINING';
  isDraft?: boolean;
}

export const createClinicalNote = async (data: CreateClinicalNotePayload) => {
  const response = await axiosInstance.post('/api/clinical-notes', data);
  return response.data;
};

export const useCreateClinicalNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createClinicalNote,
    onSuccess: (_, variables) => {
      // Invalidate compliance status so the dashboard and time-tracker update instantly!
      queryClient.invalidateQueries({ queryKey: ['appointment-compliance', variables.appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['appointment', variables.appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['clinical-notes'] });
    },
  });
};
