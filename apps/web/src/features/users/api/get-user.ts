import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';
import { User } from './get-users';

export const getUser = async (id: string): Promise<User> => {
  const { data } = await axiosInstance.get(`/api/users/${id}`);
  return data?.data || data;
};

export const useUser = (id: string) => {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => getUser(id),
    enabled: !!id,
  });
};
