import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'PARTIALLY_PAID';

export interface InvoiceListDTO {
  id: string;
  status: InvoiceStatus;
  // add other summary fields as needed
}

export const useInvoices = (params?: Record<string, any>) => {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn: async (): Promise<InvoiceListDTO[]> => {
      // 🟢 MAIN FIX: Removed extra '/api' from the path. 
      // axiosInstance automatically adds '/api/v1', so final URL becomes '/api/v1/billing/invoices'
      const { data } = await axiosInstance.get('/billing/invoices', { params });
      return data?.data || data || [];
    },
  });
};
