import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export interface CreateUserPayload {
  name: string;
  email: string;
  password?: string;
  role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
}

export const createUser = async (data: CreateUserPayload) => {
  const response = await axiosInstance.post('/api/users', data);
  return response.data;
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
