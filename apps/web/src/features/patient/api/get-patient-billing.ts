import { useQuery } from '@tanstack/react-query';
// import { axiosInstance } from '@/lib/axios'; // Will be uncommented when backend is ready

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

// Mock Data separated from the UI component
const mockBillingData: PatientBillingData = {
  summary: {
    totalOutstanding: 270.00,
    nextPaymentDueDate: 'Aug 04, 2026',
  },
  invoices: [
    {
      id: 'inv_001',
      date: 'Aug 15, 2026',
      description: 'Cognitive Behavioral Therapy - 45 min',
      amount: 150.00,
      status: 'PENDING',
      dueDate: 'Aug 30, 2026',
    },
    {
      id: 'inv_002',
      date: 'Jul 28, 2026',
      description: 'Follow-up Consultation',
      amount: 120.00,
      status: 'OVERDUE',
      dueDate: 'Aug 04, 2026',
    },
    {
      id: 'inv_003',
      date: 'Jul 10, 2026',
      description: 'Initial Intake Session',
      amount: 200.00,
      status: 'PAID',
      dueDate: 'Jul 24, 2026',
    }
  ]
};

export const useGetPatientBilling = () => {
  return useQuery({
    queryKey: ['patient-billing'],
    queryFn: async (): Promise<PatientBillingData> => {
      // Simulate network delay for realistic loading states in UI
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      // Future implementation:
      // const { data } = await axiosInstance.get('/api/patient/billing');
      // return data;

      return mockBillingData;
    },
  });
};
