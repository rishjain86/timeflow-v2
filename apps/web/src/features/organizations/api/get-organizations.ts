import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios';

export const getMyOrganizations = async () => {
  const response = await axiosInstance.get('/organizations/my-orgs');
  return response.data?.data?.organizations || [];
};

export const useMyOrganizations = () => {
  return useQuery({
    queryKey: ['organizations', 'list'],
    queryFn: getMyOrganizations,
  });
};
