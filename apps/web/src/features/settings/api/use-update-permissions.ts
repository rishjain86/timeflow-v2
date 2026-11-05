import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';
import { UserPermission } from './get-users-roles';

export interface UpdatePermissionsDTO {
  userId: string;
  permissions: UserPermission[];
}

export const useUpdatePermissions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdatePermissionsDTO) => {
      const { userId, permissions } = payload;
      // Using PUT or PATCH to update the permissions array for a specific user
      const { data } = await axiosInstance.put(`/api/settings/users/${userId}/permissions`, { permissions });
      return data;
    },
    onSuccess: () => {
      // Invalidate the main query so the UI (and any open modals) refreshes instantly
      queryClient.invalidateQueries({ queryKey: ['users-roles'] });
    },
  });
};
