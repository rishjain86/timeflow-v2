import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

// =========================================================================
// INTERFACES (Types for our new reports)
// =========================================================================

export interface AdvancedTimeReportParams {
  startDate?: string;
  endDate?: string;
  projectId?: string;
  userId?: string;
}

export interface BudgetReportParams {
  projectId?: string;
}

export interface OverageReportParams {
  projectId?: string;
  userId?: string;
  status?: string;
}

export interface ComplianceReportParams {
  projectId?: string;
  userId?: string;
  complianceStatus?: 'COMPLIANT' | 'NON_COMPLIANT';
}

// =========================================================================
// API CALL FUNCTIONS
// =========================================================================

export const getAdvancedTimeReport = async (params?: AdvancedTimeReportParams) => {
  const { data } = await axiosInstance.get('/reports/time-advanced', { params });
  return data;
};

export const getBudgetReport = async (params?: BudgetReportParams) => {
  const { data } = await axiosInstance.get('/reports/budget-status', { params });
  return data;
};

export const getOverageReport = async (params?: OverageReportParams) => {
  const { data } = await axiosInstance.get('/reports/overage-requests', { params });
  return data;
};

export const getClinicalComplianceReport = async (params?: ComplianceReportParams) => {
  const { data } = await axiosInstance.get('/reports/clinical-compliance', { params });
  return data;
};

// =========================================================================
// REACT QUERY HOOKS (For Frontend UI Components)
// =========================================================================

export const useAdvancedTimeReport = (params?: AdvancedTimeReportParams) => {
  return useQuery({
    queryKey: ['report-time-advanced', params],
    queryFn: () => getAdvancedTimeReport(params),
  });
};

export const useBudgetReport = (params?: BudgetReportParams) => {
  return useQuery({
    queryKey: ['report-budget-status', params],
    queryFn: () => getBudgetReport(params),
  });
};

export const useOverageReport = (params?: OverageReportParams) => {
  return useQuery({
    queryKey: ['report-overage-requests', params],
    queryFn: () => getOverageReport(params),
  });
};

export const useClinicalComplianceReport = (params?: ComplianceReportParams) => {
  return useQuery({
    queryKey: ['report-clinical-compliance', params],
    queryFn: () => getClinicalComplianceReport(params),
  });
};
