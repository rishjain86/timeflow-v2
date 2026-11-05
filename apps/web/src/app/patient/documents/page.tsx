'use client';

import React from 'react';
import { 
  Download, 
  AlertCircle,
  CheckCircle2,
  UploadCloud,
  File
} from 'lucide-react';

// Shadcn UI Components
import { Skeleton } from '@/components/ui/skeleton';

// API Hook
import { useGetPatientDocuments } from '@/features/patient/api/get-patient-documents';

// Helper to determine badge style based on document status
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return <span className="badge-base badge-completed"><CheckCircle2 className="w-3 h-3 mr-1" /> Signed</span>;
    case 'ACTION_NEEDED':
      return <span className="badge-base badge-overdue"><AlertCircle className="w-3 h-3 mr-1" /> Requires Action</span>;
    case 'AVAILABLE':
    default:
      return <span className="badge-base badge-draft">Available</span>;
  }
};

export default function PatientDocumentsPage() {
  const { data, isLoading, isError } = useGetPatientDocuments();

  if (isLoading) {
    return (
      <div className="timeflow-container py-6 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48 bg-muted/20" />
            <Skeleton className="h-4 w-72 mt-2 bg-muted/20" />
          </div>
          <Skeleton className="h-10 w-40 rounded-[10px] bg-muted/20" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-[16px] bg-muted/20" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="timeflow-container py-20 text-center text-muted-foreground">
        <p className="text-foreground text-lg font-medium">Failed to load documents.</p>
        <p className="mt-1">Please try refreshing.</p>
      </div>
    );
  }

  const pendingDocsCount = data.documents.filter(doc => doc.status === 'ACTION_NEEDED').length;

  return (
    <div className="timeflow-container space-y-6 animate-in fade-in duration-500 py-6">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">My Documents</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Access your intake forms, consent documents, and shared resources.
          </p>
        </div>
        <button className="btn-secondary shrink-0 w-full sm:w-auto">
          <UploadCloud className="mr-2 h-4 w-4" /> Upload Document
        </button>
      </div>

      {/* Alert for Pending Actions */}
      {pendingDocsCount > 0 && (
        <div className="bg-destructive/10 border-l-4 border-destructive p-4 rounded-r-[12px] flex items-start gap-3 shadow-sm">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-destructive">Action Required</h3>
            <p className="text-sm text-destructive/80 mt-1 font-medium">
              You have {pendingDocsCount} pending document(s) that require your attention before your next session.
            </p>
          </div>
        </div>
      )}

      {/* Documents Table */}
      <div className="enterprise-table-container flex flex-col">
        <div className="p-4 sm:p-5 border-b border-border flex flex-col bg-card">
          <h2 className="text-lg font-bold text-foreground">Files & Forms</h2>
          <p className="text-sm text-muted-foreground mt-0.5">All clinical and administrative files shared with you.</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="enterprise-table-header">
              <tr>
                <th className="enterprise-table-head pl-6">Document Name</th>
                <th className="enterprise-table-head">Category</th>
                <th className="enterprise-table-head">Date Added</th>
                <th className="enterprise-table-head">Status</th>
                <th className="enterprise-table-head text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.documents.length > 0 ? (
                data.documents.map((doc) => (
                  <tr key={doc.id} className="enterprise-table-row group hover:bg-accent/50 transition-colors">
                    <td className="enterprise-table-cell pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-primary/20 text-info border border-primary/30 rounded-[8px] flex items-center justify-center shrink-0 group-hover:bg-primary transition-colors group-hover:text-white">
                          <File className="h-4 w-4" />
                        </div>
                        <span className="font-semibold text-foreground group-hover:text-info transition-colors">{doc.name}</span>
                      </div>
                    </td>
                    <td className="enterprise-table-cell text-sm text-muted-foreground font-medium">
                      {doc.category}
                    </td>
                    <td className="enterprise-table-cell text-sm text-muted-foreground">
                      {doc.date}
                    </td>
                    <td className="enterprise-table-cell">
                      {getStatusBadge(doc.status)}
                    </td>
                    <td className="enterprise-table-cell text-right pr-6">
                      <div className="flex justify-end gap-2">
                        {doc.status === 'ACTION_NEEDED' ? (
                          <button className="btn-primary h-8 px-4 text-xs shadow-md">
                            Complete Now
                          </button>
                        ) : (
                          <button className="btn-ghost h-8 px-3 text-xs text-muted-foreground hover:text-foreground">
                            <Download className="h-4 w-4 mr-2" /> Download
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="h-32 text-center text-muted-foreground bg-background">
                    No documents found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
