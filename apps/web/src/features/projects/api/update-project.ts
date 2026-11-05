import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';
import toast from 'react-hot-toast';

export interface UpdateProjectPayload {
  id: string;
  name?: string;
  description?: string;
  status?: string;
  budget?: number;
  deadline?: string;
}

export const updateProject = async ({ id, ...data }: UpdateProjectPayload) => {
  // Yahan se '/api' hata diya gaya hai. Ab ye automatically sahi URL banayega.
  const response = await axiosInstance.patch(`/projects/${id}`, data);
  return response.data;
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProject,
    onSuccess: (_, variables) => {
      toast.success('Project updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update project');
    },
  });
};
