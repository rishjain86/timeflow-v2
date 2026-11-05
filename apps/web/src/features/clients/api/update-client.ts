import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export interface UpdateClientPayload {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  companyName?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export const useUpdateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateClientPayload) => {
      // Changed '/api/clients/${id}' to '/clients/${id}'
      const { data } = await axiosInstance.patch(`/clients/${id}`, payload);
      return data?.data || data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', variables.id] });
    },
  });
};
