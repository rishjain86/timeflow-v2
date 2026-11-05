import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';
import toast from 'react-hot-toast';

export interface UpdateTaskPayload {
  id: string;
  name?: string;
  description?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';
  projectId?: string;
  assignedToId?: string;
  dueDate?: string;
}

export const updateTask = async ({ id, ...data }: UpdateTaskPayload) => {
  const response = await axiosInstance.patch(`/tasks/${id}`, data);
  return response.data;
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTask,
    onSuccess: (_, variables) => {
      toast.success('Task updated');
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update task');
    }
  });
};
