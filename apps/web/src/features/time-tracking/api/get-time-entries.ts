import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export interface TimeEntry {
  id: string;
  taskId?: string;
  projectId?: string;
  appointmentId?: string; 
  userId?: string;
  date: string; // Updated to match backend schema
  duration: number;
  description?: string;
  isBillable?: boolean;
  project?: { id: string; name: string };
  task?: { id: string; name: string };
  user?: { id: string; firstName: string; lastName: string };
}

export interface GetTimeEntriesParams {
  projectId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  page?: number;
}

export const useTimeEntries = (params?: GetTimeEntriesParams) => {
  return useQuery({
    queryKey: ['time-entries', params],
    queryFn: async (): Promise<TimeEntry[]> => {
      // Updated endpoint to match the backend routes
      const { data } = await axiosInstance.get('/time-entries', { params });
      return data?.data || data || [];
    },
  });
};
