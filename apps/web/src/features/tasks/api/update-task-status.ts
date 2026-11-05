import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';
import toast from 'react-hot-toast';

interface UpdateTaskStatusVariables {
  id: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';
}

export const updateTaskStatus = async ({ id, status }: UpdateTaskStatusVariables) => {
  const response = await axiosInstance.patch(`/tasks/${id}`, { status }); // Removed /status from endpoint as per backend routes
  return response.data;
};

export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTaskStatus,
    onSuccess: (_, variables) => {
      toast.success('Task status updated');
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update task status');
    }
  });
};
