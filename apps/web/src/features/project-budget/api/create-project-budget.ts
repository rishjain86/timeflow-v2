import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface CreateProjectBudgetDTO {
  projectId: string;
  totalAllocatedHours: number;
  allowOverBudget?: boolean;
  alert50Enabled?: boolean;
  alert75Enabled?: boolean;
  alert90Enabled?: boolean;
  alert100Enabled?: boolean;
}

export const createProjectBudget = async (data: CreateProjectBudgetDTO) => {
  const response = await apiClient.post('/api/v1/project-budgets', data);
  return response.data?.data || response.data;
};

export const useCreateProjectBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProjectBudget,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-budget', variables.projectId] });
    },
  });
};
