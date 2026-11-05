import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';

export const switchOrganization = async (organizationId: string) => {
  const response = await axiosInstance.post('/organizations/switch', { organizationId });
  return response.data;
};

export const useSwitchOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: switchOrganization,
    onSuccess: () => {
      // Jab organization switch ho, page reload kar do taaki saara cache/data fresh aaye
      window.location.href = '/dashboard'; 
    },
  });
};
