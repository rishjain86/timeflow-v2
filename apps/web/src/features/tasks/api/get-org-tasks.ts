import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export const useOrgTasks = () => {
  return useQuery({
    queryKey: ['organization-tasks'],
    queryFn: async (): Promise<string[]> => {
      const { data } = await axiosInstance.get('/tasks/organization-tasks');
      return data?.data || [];
    },
  });
};
