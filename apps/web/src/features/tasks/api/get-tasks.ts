import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export interface Task {
  id: string;
  name: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';
  projectId?: string;
  assignedToId?: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  dueDate?: string;
}

export interface GetTasksParams {
  projectId?: string;
  status?: string;
  assignedToId?: string;
}

export const useTasks = (params?: GetTasksParams) => {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: async (): Promise<Task[]> => {
      const { data } = await axiosInstance.get('/tasks', { params });
      const tasksList = data?.data?.tasks || data?.tasks || data?.data || data || [];
      return Array.isArray(tasksList) ? tasksList : [];
    },
  });
};
