'use client';

import React from 'react';
import { FileText, Trash2, Download, Loader2, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface Attachment {
  id: string;
  fileName: string;
  originalName: string;
  url: string;
  size: number;
  createdAt: string;
  uploadedBy?: {
    firstName: string;
    lastName: string;
  };
}

interface AttachmentListProps {
  entityType: 'project' | 'task' | 'expense' | 'client' | 'invoice' | 'attendance' | 'clinicalNoteReview';
  entityId: string;
}

export function AttachmentList({ entityType, entityId }: AttachmentListProps) {
  const queryClient = useQueryClient();

  const entityIdKeyMap: Record<string, string> = {
    project: 'projectId',
    task: 'taskId',
    expense: 'expenseId',
    client: 'clientId',
    invoice: 'invoiceId',
    attendance: 'attendanceId',
    clinicalNoteReview: 'clinicalNoteReviewId',
  };

  const queryKey = ['attachments', entityType, entityId];

  const { data: attachments = [], isLoading, isError } = useQuery({
    queryKey,
    queryFn: async (): Promise<Attachment[]> => {
      const response = await apiClient.get('/attachments', {
        params: {
          [entityIdKeyMap[entityType]]: entityId,
        },
      });
      return response.data?.data || response.data || [];
    },
    enabled: !!entityId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/attachments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex gap-2 items-start">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <p>Failed to load attachments.</p>
      </div>
    );
  }

  if (attachments.length === 0) {
    return null; 
  }

  return (
    <div className="space-y-3 mt-4">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Uploaded Files</h4>
      <div className="space-y-2">
        {attachments.map((file) => (
          <div key={file.id} className="flex items-center justify-between p-3 bg-background border border-border rounded-[12px] group hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate" title={file.originalName}>
                  {file.originalName}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                  <span>{formatFileSize(file.size)}</span>
                  <span>•</span>
                  <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                  {file.uploadedBy && (
                    <>
                      <span>•</span>
                      <span>By {file.uploadedBy.firstName}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <a 
                href={file.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                title="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
              <button 
                onClick={() => {
                  if (confirm('Are you sure you want to delete this file?')) {
                    deleteMutation.mutate(file.id);
                  }
                }}
                disabled={deleteMutation.isPending}
                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors disabled:opacity-50"
                title="Delete"
              >
                {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
