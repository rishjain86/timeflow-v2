import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export interface UpdateTimeEntryPayload {
  id: string;
  taskId?: string;
  projectId?: string;
  appointmentId?: string; // SPRINT 6: Link to Appointment for Clinical Compliance
  startTime?: string;
  endTime?: string;
  description?: string;
  isBillable?: boolean;
}

export const updateTimeEntry = async ({ id, ...data }: UpdateTimeEntryPayload) => {
  const response = await axiosInstance.patch(`/api/time-tracking/${id}`, data);
  return response.data;
};

export const useUpdateTimeEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTimeEntry,
    onSuccess: () => {
      // Invalidate time entries cache so updated entry reflects immediately
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      // SPRINT 6: Refresh budget calculations
      queryClient.invalidateQueries({ queryKey: ['project-budget'] });
    },
  });
};
