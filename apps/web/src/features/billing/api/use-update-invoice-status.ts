import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export interface UpdateInvoiceStatusDTO {
  id: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'PARTIALLY_PAID' | string;
}

export const useUpdateInvoiceStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: UpdateInvoiceStatusDTO) => {
      // 🟢 FIX: Removed '/api' to prevent double appending
      // Assuming a PATCH request to update the status. Adjust endpoint if needed.
      const { data } = await axiosInstance.patch(`/billing/invoices/${id}/status`, { status });
      return data;
    },
    onSuccess: (_, variables) => {
      // This is the magic for Priority 4! 
      // It forces the List, Dashboard, and Detail pages to automatically re-fetch the latest data.
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['billing-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.id] });
    },
  });
};
