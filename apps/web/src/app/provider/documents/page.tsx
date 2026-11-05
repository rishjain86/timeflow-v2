'use client';

import React from 'react';
import { 
  UploadCloud, 
  Download, 
  ShieldCheck, 
  MoreVertical,
  File,
  Search,
  Folder
} from 'lucide-react';

// Shadcn UI Components
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

// API Hook
import { useGetProviderDocuments } from '@/features/provider/api/get-provider-documents';

// Helper to determine badge style based on status
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'ACTIVE':
    case 'AVAILABLE':
      return <span className="badge-base badge-paid"><ShieldCheck className="w-3 h-3 mr-1" /> {status}</span>;
    case 'EXPIRED':
      return <span className="badge-base badge-cancelled">Expired</span>;
    default:
      return <span className="badge-base badge-draft">{status}</span>;
  }
};

export default function ProviderDocumentsPage() {
  const { data, isLoading, isError } = useGetProviderDocuments();

  if (isLoading) {
    return (
      <div className="timeflow-container py-6 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Skeleton className="h-10 w-64 bg-muted/20" />
            <Skeleton className="h-4 w-80 mt-2 bg-muted/20" />
          </div>
          <Skeleton className="h-[44px] w-44 rounded-[10px] bg-muted/20" />
        </div>
        <div className="enterprise-card p-0 overflow-hidden">
          <div className="p-5 border-b border-border bg-card flex justify-between items-center gap-4">
            <Skeleton className="h-[40px] w-96 rounded-[10px] bg-muted/20" />
            <Skeleton className="h-[40px] w-64 rounded-[10px] bg-muted/20" />
          </div>
          <div className="p-6">
             <Skeleton className="h-[400px] w-full bg-muted/25" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="timeflow-container py-20 text-center text-muted-foreground">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Failed to load documents</h2>
        <p className="mt-2 text-sm sm:text-base">Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="timeflow-container space-y-6 animate-in fade-in duration-500 py-6">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Documents & Resources</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage your credentials, training certificates, and patient handouts.
          </p>
        </div>
        <button className="btn-secondary shrink-0 w-full sm:w-auto h-[44px]">
          <UploadCloud className="mr-2 h-4 w-4" /> Upload Document
        </button>
      </div>

      <div className="enterprise-table-container flex flex-col">
        
        {/* Toolbar */}
        <div className="p-4 sm:p-5 border-b border-border bg-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              placeholder="Search documents..." 
              className="w-full h-[40px] pl-9 pr-3 rounded-[10px] bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
            />
          </div>
          <Tabs defaultValue="all" className="w-full sm:w-auto">
            <TabsList className="grid w-full sm:w-[300px] grid-cols-3 bg-background border border-border h-[40px] p-1 rounded-[10px]">
              <TabsTrigger value="all" className="rounded-[7px] data-[state=active]:bg-accent data-[state=active]:text-foreground text-muted-foreground text-xs font-semibold transition-all">All</TabsTrigger>
              <TabsTrigger value="credentials" className="rounded-[7px] data-[state=active]:bg-accent data-[state=active]:text-foreground text-muted-foreground text-xs font-semibold transition-all">Credentials</TabsTrigger>
              <TabsTrigger value="handouts" className="rounded-[7px] data-[state=active]:bg-accent data-[state=active]:text-foreground text-muted-foreground text-xs font-semibold transition-all">Handouts</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="enterprise-table-header">
              <tr>
                <th className="enterprise-table-head pl-6">Document Name</th>
                <th className="enterprise-table-head">Category</th>
                <th className="enterprise-table-head">Upload Date</th>
                <th className="enterprise-table-head">Expiry / Status</th>
                <th className="enterprise-table-head text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.documents.length > 0 ? (
                data.documents.map((doc) => (
                  <tr key={doc.id} className="enterprise-table-row group hover:bg-accent/50 transition-colors">
                    <td className="enterprise-table-cell pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-primary/20 text-info border border-primary/30 rounded-[8px] flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                          {doc.category === 'Patient Handout' ? <Folder className="h-4 w-4" /> : <File className="h-4 w-4" />}
                        </div>
                        <span className="font-semibold text-foreground group-hover:text-info transition-colors">{doc.name}</span>
                      </div>
                    </td>
                    <td className="enterprise-table-cell text-sm text-muted-foreground font-medium">
                      {doc.category}
                    </td>
                    <td className="enterprise-table-cell text-sm text-muted-foreground">
                      {doc.uploadDate}
                    </td>
                    <td className="enterprise-table-cell">
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(doc.status)}
                        {doc.expiry !== 'N/A' && (
                          <span className="text-xs text-muted-foreground font-medium">Expires: {doc.expiry}</span>
                        )}
                      </div>
                    </td>
                    <td className="enterprise-table-cell text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <button className="btn-ghost h-8 px-3 text-xs text-muted-foreground hover:text-foreground flex items-center">
                          <Download className="h-3.5 w-3.5 mr-1.5" /> Download
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="btn-ghost h-8 w-8 p-0 opacity-80 group-hover:opacity-100 hover:text-foreground rounded-md">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 border-border rounded-[12px] bg-card shadow-xl text-foreground">
                            <DropdownMenuItem className="cursor-pointer focus:bg-accent focus:text-foreground">Rename File</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer focus:bg-accent focus:text-foreground">Update Document</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer font-medium transition-colors">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
