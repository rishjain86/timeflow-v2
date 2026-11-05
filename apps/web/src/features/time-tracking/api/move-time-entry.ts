// apps/web/src/features/time-tracking/api/move-time-entry.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export interface MoveTimeEntryPayload {
  id: string;
  newProjectId: string;
  newTaskId?: string | null;
  reason?: string;
  cnrDocument?: File | null;
  attendanceDocument?: File | null;
  isManagerOverride?: boolean;
}

export const moveTimeEntry = async ({ id, cnrDocument, attendanceDocument, ...data }: MoveTimeEntryPayload) => {
  const formData = new FormData();
  
  formData.append('newProjectId', data.newProjectId);
  if (data.newTaskId) formData.append('newTaskId', data.newTaskId);
  if (data.reason) formData.append('reason', data.reason);
  
  // Convert boolean to string for FormData
  formData.append('isManagerOverride', String(data.isManagerOverride === true));

  if (cnrDocument instanceof File) {
    formData.append('cnrDocument', cnrDocument);
  }
  if (attendanceDocument instanceof File) {
    formData.append('attendanceDocument', attendanceDocument);
  }

  // 🟢 THE MAGIC FIX: Explicitly bypass global JSON header 
  // Ye lagane se Axios documents ko delete nahi karega aur data safely backend jayega
  const response = await axiosInstance.post(`/time-entries/${id}/move`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const useMoveTimeEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: moveTimeEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['project-budget'] });
    },
  });
};
