import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

// Types for the dashboard data
export interface ExpiringAuthorization {
  id: string;
  clientId: string;
  clientName: string;
  authorizationNumber: string;
  startDate: string;
  expiryDate: string;
  totalUnits: number;
  usedUnits: number;
  remainingUnits: number;
}

export interface AuthorizationUtilizationMetrics {
  totalActiveAuthorizations: number;
  totalApprovedUnits: number;
  totalUsedUnits: number;
  totalRemainingUnits: number;
  overallUtilizationPercentage: number;
  expiringAuthorizations: ExpiringAuthorization[]; // List of auths expiring soon or running out of units
}

export const useGetAuthorizationUtilization = () => {
  return useQuery({
    queryKey: ['authorization-utilization'],
    queryFn: async (): Promise<AuthorizationUtilizationMetrics> => {
      const { data } = await axiosInstance.get('/api/authorizations/utilization');
      // Handling both direct data and standard { data: ... } backend wrappers
      return data?.data || data;
    },
  });
};
