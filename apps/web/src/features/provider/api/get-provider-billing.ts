import { useQuery } from '@tanstack/react-query';
// import { axiosInstance } from '@/lib/axios'; // Uncomment when backend is ready

export type InvoiceStatus = 'PAID' | 'PENDING' | 'OVERDUE';

export interface BillingStats {
  totalEarningsMonth: string;
  pendingPayouts: string;
  unbilledSessionsCount: number;
}

export interface Invoice {
  id: string;
  date: string;
  patientName: string;
  amount: string;
  status: InvoiceStatus;
}

export interface UnbilledSession {
  id: string;
  patientName: string;
  date: string;
  serviceCode: string;
  amount: string;
}

export interface ProviderBillingData {
  stats: BillingStats;
  invoices: Invoice[];
  unbilledSessions: UnbilledSession[];
}

// Mock Data separated from the UI component
const mockBillingData: ProviderBillingData = {
  stats: {
    totalEarningsMonth: '$4,250.00',
    pendingPayouts: '$850.00',
    unbilledSessionsCount: 4
  },
  invoices: [
    {
      id: 'INV-2026-081',
      date: 'Jul 25, 2026',
      patientName: 'David Kim',
      amount: '$150.00',
      status: 'PAID',
    },
    {
      id: 'INV-2026-082',
      date: 'Jul 26, 2026',
      patientName: 'Sarah Jenkins',
      amount: '$200.00',
      status: 'PENDING',
    },
    {
      id: 'INV-2026-079',
      date: 'Jul 10, 2026',
      patientName: 'Emma Watson',
      amount: '$150.00',
      status: 'OVERDUE',
    }
  ],
  unbilledSessions: [
    {
      id: 'ub_1',
      patientName: 'Michael Torres',
      date: 'Jul 27, 2026',
      serviceCode: '90837 (Psychotherapy, 60 min)',
      amount: '$200.00'
    },
    {
      id: 'ub_2',
      patientName: 'David Kim',
      date: 'Jul 28, 2026',
      serviceCode: '90834 (Psychotherapy, 45 min)',
      amount: '$150.00'
    }
  ]
};

export const useGetProviderBilling = () => {
  return useQuery({
    queryKey: ['provider-billing'],
    queryFn: async (): Promise<ProviderBillingData> => {
      // Simulate network delay for realistic loading states in UI
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      // Future implementation:
      // const { data } = await axiosInstance.get('/api/provider/billing');
      // return data;

      return mockBillingData;
    },
  });
};
