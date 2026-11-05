import { useMutation } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export interface EmailInvoiceResponse {
  message: string;
  success?: boolean;
}

export const useEmailInvoice = () => {
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      // 🟢 MAIN FIX: Pointing to '/invoices' instead of '/billing/invoices'
      const { data } = await axiosInstance.post<EmailInvoiceResponse>(`/invoices/${invoiceId}/email`);
      return data;
    },
  });
};
