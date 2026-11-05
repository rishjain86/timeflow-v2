import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface UploadAttachmentPayload {
  file: File;
  projectId?: string;
  taskId?: string;
  expenseId?: string;
  clientId?: string;
  invoiceId?: string;
  attendanceId?: string;
  clinicalNoteReviewId?: string;
}

export const uploadAttachment = async (payload: UploadAttachmentPayload) => {
  const formData = new FormData();
  formData.append('file', payload.file);
  
  if (payload.projectId) formData.append('projectId', payload.projectId);
  if (payload.taskId) formData.append('taskId', payload.taskId);
  if (payload.expenseId) formData.append('expenseId', payload.expenseId);
  if (payload.clientId) formData.append('clientId', payload.clientId);
  if (payload.invoiceId) formData.append('invoiceId', payload.invoiceId);
  if (payload.attendanceId) formData.append('attendanceId', payload.attendanceId);
  if (payload.clinicalNoteReviewId) formData.append('clinicalNoteReviewId', payload.clinicalNoteReviewId);

  const response = await api.post('/attachments', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const useUploadAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadAttachment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments'] });
    },
  });
};
