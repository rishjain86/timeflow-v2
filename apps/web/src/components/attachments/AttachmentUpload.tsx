'use client';

import React, { useState, useRef } from 'react';
import { Upload, File, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface AttachmentUploadProps {
  entityType: 'project' | 'task' | 'expense' | 'client' | 'invoice' | 'attendance' | 'clinicalNoteReview';
  entityId: string;
  onUploadSuccess?: (attachment: any) => void;
}

export function AttachmentUpload({ entityType, entityId, onUploadSuccess }: AttachmentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const entityIdKeyMap: Record<string, string> = {
    project: 'projectId',
    task: 'taskId',
    expense: 'expenseId',
    client: 'clientId',
    invoice: 'invoiceId',
    attendance: 'attendanceId',
    clinicalNoteReview: 'clinicalNoteReviewId',
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append(entityIdKeyMap[entityType], entityId);

    try {
      // Changed to '/attachments' to match api-client base URL config
      const response = await apiClient.post('/attachments', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const newAttachment = response.data?.data || response.data;
      if (onUploadSuccess) {
        onUploadSuccess(newAttachment);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to upload attachment');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-2">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-[12px] border border-dashed border-border bg-[#0F172A] hover:border-primary text-muted-foreground hover:text-white transition-all text-xs font-medium disabled:opacity-50"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            Uploading file...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 text-primary" />
            Upload Attachment
          </>
        )}
      </button>

      {error && (
        <p className="text-xs text-destructive flex items-center gap-1 mt-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}
