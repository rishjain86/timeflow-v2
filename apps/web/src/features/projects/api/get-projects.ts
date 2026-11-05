import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  organizationId: string;
  budget?: number | null;
  deadline?: string | null;
  client?: any;
  createdAt?: string;
  updatedAt?: string;
  isArchived?: boolean;
}

export interface GetProjectsParams {
  search?: string;
  status?: string;
  limit?: number;
  page?: number;
}

export const useProjects = (params?: GetProjectsParams) => {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: async () => {
      // Set default pagination params, overriding limit to a standard view
      const queryParams = { limit: 20, page: 1, ...params };
      const { data } = await axiosInstance.get('/projects', { params: queryParams });
      
      const projectsList = data?.data?.projects || data?.projects || data?.data || data || [];
      const meta = data?.data?.meta || { total: projectsList.length, page: 1, totalPages: 1, limit: 20 };
      
      // Safely attach meta object to the array so existing components don't break
      const result = Array.isArray(projectsList) ? [...projectsList] : [];
      (result as any).meta = meta;
      
      return result as Project[] & { meta: { total: number; page: number; totalPages: number; limit: number } };
    },
  });
};
