import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';
import toast from 'react-hot-toast';

export interface CreateProjectPayload {
  name: string;
  description?: string;
  status?: string;
}

export const createProject = async (payload: CreateProjectPayload) => {
  // Fix: Yahan se /v1 hata diya hai
  const response = await axiosInstance.post('/projects', payload);
  return response.data;
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      toast.success('Project created successfully!');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to create project';
      toast.error(`Error: ${errorMsg}`);
    },
  });
};
