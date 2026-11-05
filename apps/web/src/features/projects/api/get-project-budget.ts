import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

// 🟢 FIX: Naye architecture ke hisaab se TypeScript Interfaces
export interface BudgetTask {
  id: string;
  taskId: string;
  allocatedHours: number;
  consumedHours: number;
  remainingHours: number;
  task: { id: string; name: string; isBillable: boolean };
}

export interface BudgetMember {
  id: string;
  userId: string;
  allocatedHours: number;
  consumedHours: number;
  remainingHours: number;
  user: { id: string; firstName: string; lastName: string; email: string };
}

export interface ProjectBudgetResponse {
  id: string;
  projectId: string;
  totalAllocatedHours: number;
  status: string;
  // Tasks aur Members ab alag-alag arrays hain (Shared Pool)
  taskBudgets: BudgetTask[];
  memberBudgets: BudgetMember[];
}

export const getProjectBudget = async (projectId: string): Promise<ProjectBudgetResponse | null> => {
  if (!projectId) return null;
  const response = await axiosInstance.get(`/project-budgets/project/${projectId}`);
  return response.data?.data;
};

export const useProjectBudget = (projectId: string) => {
  return useQuery({
    queryKey: ['project-budget', projectId],
    queryFn: () => getProjectBudget(projectId),
    enabled: !!projectId,
  });
};
