import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';
import { RoleType } from './get-users-roles';

export interface CreateUserDTO {
  name: string;
  email: string; // Email is required when creating a new user
  role: RoleType;
  isActive: boolean;
}

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateUserDTO) => {
      const { data } = await axiosInstance.post('/api/settings/users', payload);
      return data;
    },
    onSuccess: () => {
      // Magically refresh the users list so the table updates instantly!
      queryClient.invalidateQueries({ queryKey: ['users-roles'] });
    },
  });
};
