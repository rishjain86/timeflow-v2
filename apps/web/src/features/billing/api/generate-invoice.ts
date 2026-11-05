import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export interface GenerateInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface GenerateInvoicePayload {
  clientId: string;
  issueDate?: string;
  dueDate: string;
  notes?: string;
  items: GenerateInvoiceItem[];
  logo?: string | null; // Logo support already added
}

export const generateInvoice = async (data: GenerateInvoicePayload) => {
  // 🟢 MAIN FIX: Pointing to the correct Single Invoice Generation endpoint!
  // It routes to /api/v1/invoices/generate
  const response = await axiosInstance.post('/invoices/generate', data); 
  return response.data;
};

export const useGenerateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateInvoice,
    onSuccess: () => {
      // Invalidate invoices list so the new invoice shows up immediately
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      // Invalidate metrics so dashboard updates automatically
      queryClient.invalidateQueries({ queryKey: ['billing-metrics'] });
    },
  });
};
