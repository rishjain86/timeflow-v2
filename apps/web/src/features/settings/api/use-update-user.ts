import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';
import { RoleType } from './get-users-roles';

export interface UpdateUserDTO {
  id: string;
  name?: string;
  email?: string;
  role?: RoleType;
  isActive?: boolean;
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateUserDTO) => {
      // Destructure id from payload, send the rest as body
      const { id, ...dataToUpdate } = payload;
      const { data } = await axiosInstance.patch(`/api/settings/users/${id}`, dataToUpdate);
      return data;
    },
    onSuccess: () => {
      // Magically refresh the users list so the table updates instantly!
      queryClient.invalidateQueries({ queryKey: ['users-roles'] });
    },
  });
};
