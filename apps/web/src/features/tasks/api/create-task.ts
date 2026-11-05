import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';
import toast from 'react-hot-toast';

export interface CreateTaskPayload {
  name: string;
  description?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';
  projectId: string;
  assignedToId?: string;
  dueDate?: string;
}

export const createTask = async (data: CreateTaskPayload) => {
  const response = await axiosInstance.post('/tasks', data);
  return response.data;
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTask,
    onSuccess: (_, variables) => {
      toast.success('Task created successfully!');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', { projectId: variables.projectId }] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create task');
    }
  });
};
