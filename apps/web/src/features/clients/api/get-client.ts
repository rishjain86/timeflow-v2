import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';
import { Client } from './get-clients';

export const useClient = (id: string) => {
  return useQuery({
    queryKey: ['client', id],
    queryFn: async (): Promise<Client> => {
      // Changed '/api/clients/${id}' to '/clients/${id}'
      const { data } = await axiosInstance.get(`/clients/${id}`);
      return data?.data || data;
    },
    enabled: !!id, // Only fetch if ID exists
  });
};
