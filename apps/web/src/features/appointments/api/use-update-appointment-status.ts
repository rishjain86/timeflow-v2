import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { AppointmentStatus } from '@/features/calendar/api/get-calendar-appointments';

export interface UpdateAppointmentDTO {
  id: string;
  status: AppointmentStatus;
  notes?: string;
  cancellationReason?: string;
}

export const useUpdateAppointmentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateAppointmentDTO) => {
      const response = await apiClient.patch(`/appointments/${payload.id}/status`, payload);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['therapist-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['appointment', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['appointment-compliance', variables.id] });
    },
  });
};
