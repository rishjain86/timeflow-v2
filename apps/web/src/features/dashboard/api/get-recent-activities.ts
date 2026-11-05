import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export interface Activity {
  id: string;
  type: 'INVOICE' | 'PROJECT' | 'TASK' | 'TIME_ENTRY' | 'CLIENT';
  description: string;
  createdAt: string;
}

export const useRecentActivities = () => {
  return useQuery({
    queryKey: ['recent-activities'],
    queryFn: async (): Promise<Activity[]> => {
      const { data } = await axiosInstance.get('/api/dashboard/activities');
      return data?.data || data || [];
    },
  });
};
