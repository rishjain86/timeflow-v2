import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

// Types for the dashboard metrics
export interface MonthlyRevenue {
  month: string; // e.g., 'Jan', 'Feb', '2026-01'
  revenue: number;
}

export interface BillingMetrics {
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  totalRevenue: number;
  outstandingAmount: number;
  monthlyRevenue: MonthlyRevenue[];
}

export const useGetBillingMetrics = () => {
  return useQuery({
    queryKey: ['billing-metrics'],
    queryFn: async (): Promise<BillingMetrics> => {
      // 🟢 FIX: Removed '/api' to prevent double appending
      const { data } = await axiosInstance.get('/billing/metrics');
      // Adjusting based on whether backend wraps response in { data: ... }
      return data?.data || data; 
    },
  });
};
