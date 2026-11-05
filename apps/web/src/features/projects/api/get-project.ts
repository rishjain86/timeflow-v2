import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export interface ProjectDetail {
  id: string;
  name: string;
  description?: string;
  status: string;
  organizationId: string;
  budget?: number | null;
  deadline?: string | null;
  endDate?: string | null;
  client?: any;
  createdAt?: string;
  updatedAt?: string;
}

export const getProject = async (id: string): Promise<ProjectDetail> => {
  const { data } = await axiosInstance.get(`/projects/${id}`);
  
  return data?.data?.project || data?.project || data?.data || data;
};

export const useProject = (id: string) => {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id),
    enabled: !!id, 
  });
};
