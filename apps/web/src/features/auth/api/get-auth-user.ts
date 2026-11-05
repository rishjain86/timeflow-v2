import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  role: string;
  organizationId: string;
}

export const getAuthUser = async (): Promise<AuthUser | null> => {
  const { data } = await axiosInstance.get('/auth/me');
  return data?.data?.user || data?.data || data;
};

export const useAuthUser = () => {
  return useQuery({
    queryKey: ['auth-user'],
    queryFn: getAuthUser,
    retry: false, 
    staleTime: Infinity, 
  });
};
