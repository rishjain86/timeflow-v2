import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface ProjectTaskBudget {
  id: string;
  taskId: string;
  allocatedHours: number;
  consumedHours: number;
  remainingHours: number;
  progressPercentage: number;
  status: string;
  sessionLimitHours: number | null;
  task: {
    id: string;
    name: string;
    requiresClinicalCompliance: boolean;
  };
}

export interface ProjectMemberBudget {
  id: string;
  userId: string;
  allocatedHours: number;
  consumedHours: number;
  remainingHours: number;
  progressPercentage: number;
  status: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  taskBudgets: ProjectTaskBudget[];
}

export interface ProjectBudget {
  id: string;
  projectId: string;
  totalAllocatedHours: number;
  consumedHours: number;
  remainingHours: number;
  progressPercentage: number;
  status: string;
  allowOverBudget: boolean;
  alert50Enabled: boolean;
  alert75Enabled: boolean;
  alert90Enabled: boolean;
  alert100Enabled: boolean;
  memberBudgets: ProjectMemberBudget[];
}

export const getProjectBudget = async (projectId: string): Promise<ProjectBudget> => {
  const response = await apiClient.get(`/api/v1/project-budgets/project/${projectId}`);
  return response.data?.data || response.data;
};

export const useProjectBudget = (projectId: string) => {
  return useQuery({
    queryKey: ['project-budget', projectId],
    queryFn: () => getProjectBudget(projectId),
    enabled: !!projectId,
  });
};
