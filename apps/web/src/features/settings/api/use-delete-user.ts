import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export const useDeleteSettingsUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.delete(`/api/settings/users/${id}`);
      return data;
    },
    onSuccess: () => {
      // Refresh the roles and users list instantly after deletion
      queryClient.invalidateQueries({ queryKey: ['users-roles'] });
    },
  });
};
