import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export interface ActiveTimer {
  id: string;
  taskId?: string;
  projectId?: string;
  appointmentId?: string; // SPRINT 6
  startTime: string;
  description?: string;
}

export const useActiveTimer = () => {
  return useQuery({
    queryKey: ['active-timer'],
    queryFn: async (): Promise<ActiveTimer | null> => {
      const { data } = await axiosInstance.get('/api/time-tracking/active');
      return data?.data || data || null;
    },
  });
};

export interface StartTimerPayload {
  taskId?: string;
  projectId?: string;
  appointmentId?: string; // SPRINT 6
  description?: string;
}

export const useStartTimer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: StartTimerPayload) => {
      const response = await axiosInstance.post('/api/time-tracking/start', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-timer'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
  });
};

export const useStopTimer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (timerId: string) => {
      const response = await axiosInstance.post(`/api/time-tracking/stop/${timerId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-timer'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      // SPRINT 6: Refresh budget because stopping a timer finalizes a time entry
      queryClient.invalidateQueries({ queryKey: ['project-budget'] });
    },
  });
};
