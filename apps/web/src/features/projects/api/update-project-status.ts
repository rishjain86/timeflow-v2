import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';
import toast from 'react-hot-toast';

interface UpdateProjectStatusVariables {
  id: string;
  status: string;
}

export const updateProjectStatus = async ({ id, status }: UpdateProjectStatusVariables) => {
  const response = await axiosInstance.patch(`/projects/${id}/status`, {
    status,
  });
  return response.data;
};

export const useUpdateProjectStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProjectStatus,
    onSuccess: (_, variables) => {
      // Toast notification add kar di hai
      toast.success('Project status updated!');
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update status');
    }
  });
};
