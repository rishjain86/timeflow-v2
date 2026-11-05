import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

// Types for Analytics Data
export interface TrendData {
  label: string; // e.g., 'Jan', 'Feb', or 'Week 1'
  value: number;
}

export interface AnalyticsMetrics {
  totalRevenue: number;
  revenueGrowth: number; // + or - percentage compared to previous period
  activeClients: number;
  clientGrowth: number; // + or - percentage
  appointmentCompletionRate: number; // percentage (Completed vs Scheduled)
  therapistUtilizationRate: number; // percentage (Billable hours vs Available hours)
  
  // Data arrays for Charts
  revenueTrends: TrendData[];
  utilizationTrends: TrendData[];
}

export interface GetAnalyticsParams {
  period: '7d' | '30d' | '90d' | '12m';
}

export const useGetAnalytics = (params: GetAnalyticsParams) => {
  return useQuery({
    queryKey: ['analytics', params],
    queryFn: async (): Promise<AnalyticsMetrics> => {
      const { data } = await axiosInstance.get('/api/analytics/dashboard', { params });
      return data?.data || data;
    },
  });
};
