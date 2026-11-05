'use client';

import React from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  UserPlus, 
  Activity,
  Calendar
} from 'lucide-react';

// Shadcn UI Components
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

// API Hook
import { useGetProviderPatients } from '@/features/provider/api/get-provider-patients';

// Helper to determine badge style based on status
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return <span className="badge-base badge-paid">Active</span>;
    case 'ONBOARDING':
      return <span className="badge-base badge-info">Onboarding</span>;
    case 'INACTIVE':
      return <span className="badge-base badge-cancelled">Inactive</span>;
    default:
      return <span className="badge-base badge-draft">{status}</span>;
  }
};

export default function ProviderPatientsPage() {
  const { data, isLoading, isError } = useGetProviderPatients();

  if (isLoading) {
    return (
      <div className="timeflow-container py-6 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-10 w-64 bg-muted/20" />
            <Skeleton className="h-4 w-72 mt-2 bg-muted/20" />
          </div>
          <Skeleton className="h-[44px] w-40 rounded-[10px] bg-muted/20" />
        </div>
        <div className="enterprise-card p-0 overflow-hidden">
          <div className="p-5 border-b border-border bg-card flex justify-between items-center gap-4">
             <Skeleton className="h-[40px] w-96 rounded-[10px] bg-muted/20" />
             <Skeleton className="h-[40px] w-32 rounded-[10px] bg-muted/20" />
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
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Failed to load patients list</h2>
        <p className="mt-2 text-sm sm:text-base">Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="timeflow-container space-y-6 animate-in fade-in duration-500 py-6">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Patients Directory</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage and view all your active and past patients.
          </p>
        </div>
        <button className="btn-primary shrink-0 w-full sm:w-auto h-[44px] shadow-md">
          <UserPlus className="mr-2 h-4 w-4" /> Add New Patient
        </button>
      </div>

      <div className="enterprise-table-container flex flex-col">
        
        {/* Toolbar: Search & Filter */}
        <div className="p-4 sm:p-5 border-b border-border bg-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              placeholder="Search by patient name..." 
              className="w-full h-[40px] pl-9 pr-3 rounded-[10px] bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
            />
          </div>
          <button className="btn-secondary w-full sm:w-auto h-[40px]">
            <Filter className="mr-2 h-4 w-4" /> Filter Status
          </button>
        </div>
        
        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="enterprise-table-header">
              <tr>
                <th className="enterprise-table-head pl-6">Patient Name</th>
                <th className="enterprise-table-head">Primary Focus</th>
                <th className="enterprise-table-head">Last Session</th>
                <th className="enterprise-table-head">Next Session</th>
                <th className="enterprise-table-head">Status</th>
                <th className="enterprise-table-head text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.patients.length > 0 ? (
                data.patients.map((patient) => (
                  <tr key={patient.id} className="enterprise-table-row group hover:bg-accent/50 transition-colors">
                    <td className="enterprise-table-cell pl-6 font-bold text-foreground group-hover:text-info transition-colors">
                      {patient.name}
                    </td>
                    <td className="enterprise-table-cell text-sm text-muted-foreground font-medium">
                      {patient.diagnosis}
                    </td>
                    <td className="enterprise-table-cell text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                        {patient.lastSession}
                      </div>
                    </td>
                    <td className="enterprise-table-cell text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {patient.nextSession}
                      </div>
                    </td>
                    <td className="enterprise-table-cell">
                      {getStatusBadge(patient.status)}
                    </td>
                    <td className="enterprise-table-cell text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <button className="btn-primary h-8 px-4 text-xs shadow-md">
                          View Chart
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="btn-ghost h-8 w-8 p-0 opacity-80 group-hover:opacity-100 hover:text-foreground rounded-md">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 border-border rounded-[12px] bg-card shadow-xl text-foreground">
                            <DropdownMenuItem className="cursor-pointer focus:bg-accent focus:text-foreground">Schedule Session</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer focus:bg-accent focus:text-foreground">Send Message</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer font-medium transition-colors">Mark Inactive</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="h-32 text-center text-muted-foreground bg-background">
                    No patients found.
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
