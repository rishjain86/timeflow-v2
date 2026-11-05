import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export interface CreateTimeEntryPayload {
  taskId?: string;
  projectId?: string;
  appointmentId?: string; // SPRINT 6: Link to Appointment for Clinical Compliance
  startTime: string;
  endTime?: string;
  description?: string;
  isBillable?: boolean;
}

export const createTimeEntry = async (data: CreateTimeEntryPayload) => {
  const response = await axiosInstance.post('/api/time-tracking', data);
  return response.data;
};

export const useCreateTimeEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTimeEntry,
    onSuccess: () => {
      // Invalidate time entries cache so the new entry shows up immediately
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      // SPRINT 6: Invalidate project budget to instantly update consumed hours and progress bars
      queryClient.invalidateQueries({ queryKey: ['project-budget'] });
    },
  });
};
