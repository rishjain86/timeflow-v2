import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';
import { toast } from 'react-hot-toast';

interface AssignTasksPayload {
  projectId: string;
  taskNames: string[];
  tasksConfig?: {
    name: string;
    requiresClinicalCompliance: boolean;
  }[];
}

export const useAssignTasks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AssignTasksPayload) => {
      const response = await axiosInstance.post('/tasks/assign', {
        projectId: data.projectId,
        taskNames: data.taskNames,
        tasksConfig: data.tasksConfig
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-tasks', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['org-tasks'] });
      toast.success('Tasks assigned successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to assign tasks';
      toast.error(message);
    },
  });
};
