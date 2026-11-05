import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';
import toast from 'react-hot-toast'; // 🟢 Added Toast Import

export const logTime = async (data: FormData | Record<string, any>) => {
  const isFormData = data instanceof FormData;
  const response = await axiosInstance.post('/time-entries', data, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json' },
  });
  return response.data;
};

export const useLogTime = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logTime,
    onSuccess: () => {
      toast.success('Time logged successfully!');
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['project-budget'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to log time');
    }
  });
};

// =========================================================
// 🟢 TIMER REACT QUERY HOOKS (Now with Error Tracking)
// =========================================================

export const useActiveTimer = () => {
  return useQuery({
    queryKey: ['active-timer'],
    queryFn: async () => {
      const res = await axiosInstance.get('/time-entries/timer/active');
      return res.data?.data?.timer || null;
    }
  });
};

export const useStartTimer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await axiosInstance.post('/time-entries/timer/start', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Timer started successfully!');
      queryClient.invalidateQueries({ queryKey: ['active-timer'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to start timer');
    }
  });
};

export const usePauseTimer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosInstance.post(`/time-entries/timer/${id}/pause`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Timer paused');
      queryClient.invalidateQueries({ queryKey: ['active-timer'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to pause timer');
    }
  });
};

export const useResumeTimer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosInstance.post(`/time-entries/timer/${id}/resume`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Timer resumed');
      queryClient.invalidateQueries({ queryKey: ['active-timer'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to resume timer');
    }
  });
};

export const useStopTimer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string, notes?: string }) => {
      const res = await axiosInstance.post(`/time-entries/timer/${id}/stop`, { notes });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Timer stopped and saved to Drafts!');
      queryClient.invalidateQueries({ queryKey: ['active-timer'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to stop timer');
    }
  });
};
