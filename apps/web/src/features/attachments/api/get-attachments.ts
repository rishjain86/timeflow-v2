import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface Attachment {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  projectId?: string | null;
  taskId?: string | null;
  expenseId?: string | null;
  clientId?: string | null;
  invoiceId?: string | null;
  attendanceId?: string | null;
  clinicalNoteReviewId?: string | null;
  uploadedById: string;
  organizationId: string;
  createdAt: string;
  uploadedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface GetAttachmentsParams {
  projectId?: string;
  taskId?: string;
  expenseId?: string;
  clientId?: string;
  invoiceId?: string;
  attendanceId?: string;
  clinicalNoteReviewId?: string;
}

export const getAttachments = async (params: GetAttachmentsParams): Promise<Attachment[]> => {
  const queryParams = new URLSearchParams();
  
  if (params.projectId) queryParams.append('projectId', params.projectId);
  if (params.taskId) queryParams.append('taskId', params.taskId);
  if (params.expenseId) queryParams.append('expenseId', params.expenseId);
  if (params.clientId) queryParams.append('clientId', params.clientId);
  if (params.invoiceId) queryParams.append('invoiceId', params.invoiceId);
  if (params.attendanceId) queryParams.append('attendanceId', params.attendanceId);
  if (params.clinicalNoteReviewId) queryParams.append('clinicalNoteReviewId', params.clinicalNoteReviewId);

  const response = await api.get(`/attachments?${queryParams.toString()}`);
  return response.data.data;
};

export const useGetAttachments = (params: GetAttachmentsParams) => {
  // Ensure at least one parameter is provided to avoid fetching all organization attachments unnecessarily
  const hasParams = Object.values(params).some((val) => val !== undefined && val !== '');

  return useQuery({
    queryKey: ['attachments', params],
    queryFn: () => getAttachments(params),
    enabled: hasParams,
  });
};
