import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export type InvoiceStatus = 'PENDING' | 'PAID' | 'OVERDUE';

export interface Invoice {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: InvoiceStatus;
  dueDate: string;
}

export interface BillingSummary {
  totalOutstanding: number;
  nextPaymentDueDate: string | null;
}

export interface PatientBillingData {
  summary: BillingSummary;
  invoices: Invoice[];
}

export const useGetPatientBilling = () => {
  return useQuery({
    queryKey: ['patient-billing'],
    queryFn: async (): Promise<PatientBillingData> => {
      const { data } = await axiosInstance.get('/patient/billing');
      return data.data;
    },
    staleTime: 30_000,
  });
};
