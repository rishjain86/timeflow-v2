import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export interface RecordPaymentPayload {
  amount: number;
  paymentDate: string; // ISO string
  paymentMethod: 'CREDIT_CARD' | 'BANK_TRANSFER' | 'CHECK' | 'CASH' | 'ONLINE' | 'OTHER';
  referenceNumber?: string;
  notes?: string;
}

interface RecordPaymentVariables {
  invoiceId: string;
  data: RecordPaymentPayload;
}

export const recordPayment = async ({ invoiceId, data }: RecordPaymentVariables) => {
  // 🟢 FIX: Removed '/api' to prevent double appending
  const response = await axiosInstance.post(`/billing/invoices/${invoiceId}/payments`, data);
  return response.data;
};

export const useRecordPayment = (invoiceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recordPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      // Refresh billing metrics dynamically
      queryClient.invalidateQueries({ queryKey: ['billing-metrics'] }); 
    },
  });
};
