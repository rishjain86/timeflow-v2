import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export const deleteTimeEntry = async (id: string) => {
  const response = await axiosInstance.delete(`/api/time-tracking/${id}`);
  return response.data;
};

export const useDeleteTimeEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTimeEntry,
    onSuccess: () => {
      // Invalidate time entries cache so the deleted entry is removed immediately
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      // SPRINT 6: Refresh budget calculations
      queryClient.invalidateQueries({ queryKey: ['project-budget'] });
    },
  });
};
