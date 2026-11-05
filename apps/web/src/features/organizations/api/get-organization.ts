import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';

export const getOrganization = async () => {
  const response = await axiosInstance.get('/organizations');
  return response.data?.data?.organization;
};

export const useOrganization = () => {
  return useQuery({
    queryKey: ['organization', 'current'],
    queryFn: getOrganization,
  });
};
