import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export interface CreateClientPayload {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  companyName?: string;
}

export const useCreateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateClientPayload) => {
      const response = await axiosInstance.post('/clients', payload);
      // DEBUG: Dekhte hain exact kya aaya
      console.log("CREATE CLIENT RAW RESPONSE:", response);
      
      const resData = response.data;
      return resData?.data?.client || resData?.client || resData?.data || resData;
    },
    onSuccess: (newClient) => {
      console.log("CLIENT CREATED SUCCESSFULLY:", newClient);
      
      // Forcefully saare clients queries ko refetch karo
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (error) => {
      console.error("CLIENT CREATION FAILED:", error);
    }
  });
};
