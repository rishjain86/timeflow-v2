import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceDetail {
  id: string;
  status: string;
  items: InvoiceItem[];
  // add other fields as needed
}

export const getInvoice = async (id: string): Promise<InvoiceDetail> => {
  // 🟢 FIX: Added /billing back to point to the correct backend route
  const { data } = await axiosInstance.get(`/billing/invoices/${id}`);
  return data?.data || data;
};

export const useInvoice = (id: string) => {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id),
    enabled: !!id,
  });
};
