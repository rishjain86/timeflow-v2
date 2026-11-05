import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  status: 'ACTIVE' | 'INACTIVE';
  avatarUrl?: string;
}

export interface GetUsersParams {
  role?: string;
  search?: string;
}

export const useUsers = (params?: GetUsersParams) => {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async (): Promise<User[]> => {
      // 🟢 FIX: Removed '/api/' because axiosInstance already adds it automatically
      const { data } = await axiosInstance.get('/users', { params });
      // Safely extracting the users array from the response object
      return data?.data?.users || data?.data || data || [];
    },
  });
};
