import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';

export interface CreateOrganizationData {
  name: string;
  domain?: string;
  companyName?: string;
  defaultCurrency?: string;
  timeZone?: string;
}

export const createOrganization = async (data: CreateOrganizationData) => {
  const response = await axiosInstance.post('/organizations', data);
  return response.data;
};

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
};
