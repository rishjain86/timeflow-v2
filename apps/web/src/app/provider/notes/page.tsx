'use client';

import React from 'react';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  Edit3, 
  AlertCircle,
  Search,
  Filter
} from 'lucide-react';

// Shadcn UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

// API Hook
import { useGetProviderNotes } from '@/features/provider/api/get-provider-notes';

// Helper to determine badge style based on status
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'SIGNED':
      return <span className="badge-base badge-paid"><CheckCircle2 className="w-3 h-3 mr-1" /> Signed</span>;
    case 'DRAFT':
      return <span className="badge-base badge-info"><Edit3 className="w-3 h-3 mr-1" /> Draft</span>;
    case 'MISSING':
      return <span className="badge-base badge-overdue"><AlertCircle className="w-3 h-3 mr-1" /> Action Required</span>;
    default:
      return <span className="badge-base badge-draft">{status}</span>;
  }
};

export default function ProviderNotesPage() {
  const { data, isLoading, isError } = useGetProviderNotes();

  if (isLoading) {
    return (
      <div className="timeflow-container py-6 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Skeleton className="h-10 w-64 bg-muted/20" />
            <Skeleton className="h-4 w-80 mt-2 bg-muted/20" />
          </div>
          <Skeleton className="h-[44px] w-48 rounded-[10px] bg-muted/20" />
        </div>
        <div className="space-y-6">
           <Skeleton className="h-[48px] w-full sm:w-[400px] rounded-[12px] bg-muted/20" />
           <div className="enterprise-card p-0 overflow-hidden">
              <div className="p-5 border-b border-border bg-card">
                <Skeleton className="h-6 w-48 mb-2 bg-muted/20" />
                <Skeleton className="h-4 w-96 bg-muted/20" />
              </div>
              <div className="p-6">
                <Skeleton className="h-64 w-full bg-muted/20" />
              </div>
           </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="timeflow-container py-20 text-center text-muted-foreground">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Failed to load clinical notes</h2>
        <p className="mt-2 text-sm sm:text-base">Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="timeflow-container space-y-6 animate-in fade-in duration-500 py-6">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Clinical Notes</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage your session documentation, drafts, and signed charts.
          </p>
        </div>
        <button className="btn-primary shrink-0 w-full sm:w-auto h-[44px] shadow-md">
          <FileText className="mr-2 h-4 w-4" /> Create Ad-hoc Note
        </button>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <TabsList className="grid w-full sm:w-[400px] grid-cols-2 bg-card border border-border h-[48px] p-1 rounded-[12px]">
            <TabsTrigger value="pending" className="rounded-[8px] data-[state=active]:bg-accent data-[state=active]:text-foreground text-muted-foreground transition-all flex items-center justify-center gap-2">
              Pending Notes
              <span className="badge-base bg-warning/20 text-warning border border-warning/30 px-1.5 py-0.2 text-[10px]">
                {data.pendingNotes.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-[8px] data-[state=active]:bg-accent data-[state=active]:text-foreground text-muted-foreground transition-all">
              Completed
            </TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                placeholder="Search patient..." 
                className="w-full h-[40px] pl-9 pr-3 rounded-[10px] bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
              />
            </div>
            <button className="btn-secondary shrink-0 h-[40px] px-3">
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* PENDING NOTES TAB */}
        <TabsContent value="pending" className="space-y-4">
          <div className="enterprise-table-container flex flex-col border border-warning/30 shadow-md">
            <div className="p-4 sm:p-5 border-b border-border bg-card">
              <h2 className="text-lg font-bold text-foreground">Action Required</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Sessions that require your documentation to be completed and signed.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="enterprise-table-header">
                  <tr>
                    <th className="enterprise-table-head pl-6">Patient & Session</th>
                    <th className="enterprise-table-head">Date & Time</th>
                    <th className="enterprise-table-head">Deadline</th>
                    <th className="enterprise-table-head">Status</th>
                    <th className="enterprise-table-head text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pendingNotes.length > 0 ? (
                    data.pendingNotes.map((note) => (
                      <tr key={note.id} className="enterprise-table-row group hover:bg-accent/50 transition-colors">
                        <td className="enterprise-table-cell pl-6">
                          <div className="font-bold text-foreground group-hover:text-info transition-colors">{note.patientName}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 font-medium">{note.sessionType}</div>
                        </td>
                        <td className="enterprise-table-cell text-sm text-muted-foreground">
                          {note.sessionDate}
                        </td>
                        <td className="enterprise-table-cell">
                          <div className={`text-sm flex items-center font-semibold ${note.status === 'MISSING' ? 'text-destructive' : 'text-warning'}`}>
                            <Clock className="h-3.5 w-3.5 mr-1.5 shrink-0" /> {note.dueDate}
                          </div>
                        </td>
                        <td className="enterprise-table-cell">
                          {getStatusBadge(note.status)}
                        </td>
                        <td className="enterprise-table-cell text-right pr-6">
                          {note.status === 'MISSING' ? (
                            <button className="btn-primary h-8 px-4 text-xs shadow-md">
                              Write Note
                            </button>
                          ) : (
                            <button className="btn-secondary h-8 px-4 text-xs text-muted-foreground hover:text-foreground">
                              Resume Draft
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="h-32 text-center text-muted-foreground bg-background">
                        All caught up! No pending notes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* COMPLETED NOTES TAB */}
        <TabsContent value="completed" className="space-y-4">
          <div className="enterprise-table-container flex flex-col">
            <div className="p-4 sm:p-5 border-b border-border bg-card">
              <h2 className="text-lg font-bold text-foreground">Signed Documentation</h2>
              <p className="text-sm text-muted-foreground mt-0.5">A historical log of all your finalized and signed clinical notes.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="enterprise-table-header">
                  <tr>
                    <th className="enterprise-table-head pl-6">Patient & Session</th>
                    <th className="enterprise-table-head">Session Date</th>
                    <th className="enterprise-table-head">Signed On</th>
                    <th className="enterprise-table-head">Status</th>
                    <th className="enterprise-table-head text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.completedNotes.length > 0 ? (
                    data.completedNotes.map((note) => (
                      <tr key={note.id} className="enterprise-table-row group hover:bg-accent/50 transition-colors">
                        <td className="enterprise-table-cell pl-6">
                          <div className="font-bold text-foreground group-hover:text-info transition-colors">{note.patientName}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 font-medium">{note.sessionType}</div>
                        </td>
                        <td className="enterprise-table-cell text-sm text-muted-foreground">
                          {note.sessionDate}
                        </td>
                        <td className="enterprise-table-cell text-sm text-muted-foreground">
                          {note.signedOn}
                        </td>
                        <td className="enterprise-table-cell">
                          {getStatusBadge(note.status)}
                        </td>
                        <td className="enterprise-table-cell text-right pr-6">
                          <button className="btn-ghost h-8 px-3 text-xs text-info hover:text-foreground flex items-center justify-end ml-auto">
                            View Chart
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="h-32 text-center text-muted-foreground bg-background">
                        No completed notes found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
