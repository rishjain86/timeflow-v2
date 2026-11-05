import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';
import toast from 'react-hot-toast';

export interface TaskAllocation {
  taskId: string;
  allocatedHours: number;
}

export interface MemberAllocation {
  userId: string;
  allocatedHours: number;
  // 🟢 FIX: tasks yahan se hata diya gaya hai (ab members aur tasks alag hain)
}

export interface AllocateBudgetPayload {
  projectId: string;
  totalAllocatedHours: number;
  tasks: TaskAllocation[]; // 🟢 FIX: tasks ab seedha project level par aa gaya hai
  members: MemberAllocation[];
}

export const allocateBudget = async (data: AllocateBudgetPayload) => {
  const response = await axiosInstance.post('/project-budgets/allocate', data);
  return response.data;
};

export const useAllocateBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: allocateBudget,
    onSuccess: (_, variables) => {
      toast.success('Budget and team allocated successfully!');
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to allocate budget');
    }
  });
};
