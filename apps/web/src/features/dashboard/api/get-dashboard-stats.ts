import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export interface DashboardStats {
  totalRevenue: number;
  outstandingInvoices: number;
  activeProjects: number;
  pendingTasks: number;
  totalClients: number;
}

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const { data } = await axiosInstance.get('/api/dashboard/stats');
      return data?.data || data;
    },
  });
};
