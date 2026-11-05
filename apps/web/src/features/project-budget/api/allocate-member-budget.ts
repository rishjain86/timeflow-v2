import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface AllocateMemberBudgetDTO {
  projectBudgetId: string;
  userId: string;
  allocatedHours: number;
  taskAllocations?: {
    taskId: string;
    allocatedHours: number;
    sessionLimitHours?: number;
  }[];
}

export const allocateMemberBudget = async (data: AllocateMemberBudgetDTO) => {
  // 1. Create Member Budget
  const memberResponse = await apiClient.post(`/api/v1/project-budgets/${data.projectBudgetId}/members`, {
    userId: data.userId,
    allocatedHours: data.allocatedHours,
  });

  const memberBudget = memberResponse.data?.data || memberResponse.data;

  // 2. If task allocations exist, create them sequentially for this member
  if (data.taskAllocations && data.taskAllocations.length > 0 && memberBudget?.id) {
    await Promise.all(
      data.taskAllocations.map(task =>
        apiClient.post(`/api/v1/project-budgets/members/${memberBudget.id}/tasks`, task)
      )
    );
  }

  return memberBudget;
};

export const useAllocateMemberBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: allocateMemberBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-budget'] });
    },
  });
};
