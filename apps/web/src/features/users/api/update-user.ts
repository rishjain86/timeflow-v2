import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export interface UpdateUserPayload {
  id: string;
  name?: string;
  email?: string;
  role?: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
  status?: 'ACTIVE' | 'INACTIVE';
}

export const updateUser = async ({ id, ...data }: UpdateUserPayload) => {
  const response = await axiosInstance.patch(`/api/users/${id}`, data);
  return response.data;
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUser,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
