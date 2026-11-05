'use client';

import React from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Video, 
  Users, 
  MoreVertical,
  Plus
} from 'lucide-react';

// Shadcn UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

// API Hook
import { useGetProviderAppointments } from '@/features/provider/api/get-provider-appointments';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'CONFIRMED':
      return <span className="badge-base badge-paid">Confirmed</span>;
    case 'PENDING':
      return <span className="badge-base badge-pending">Pending</span>;
    case 'CANCELLED':
      return <span className="badge-base badge-cancelled">Cancelled</span>;
    default:
      return <span className="badge-base badge-draft">{status}</span>;
  }
};

export default function ProviderAppointmentsPage() {
  const { data, isLoading, isError } = useGetProviderAppointments();

  if (isLoading) {
    return (
      <div className="timeflow-container py-6 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Skeleton className="h-10 w-64 bg-muted/20" />
            <Skeleton className="h-4 w-72 mt-2 bg-muted/20" />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Skeleton className="h-[44px] w-32 rounded-[10px] bg-muted/20" />
            <Skeleton className="h-[44px] w-36 rounded-[10px] bg-muted/20" />
          </div>
        </div>
        <Skeleton className="h-[48px] w-full sm:w-[400px] rounded-[12px] mb-6 bg-muted/20" />
        <div className="space-y-6">
           <Skeleton className="h-6 w-48 bg-muted/20" />
           <Skeleton className="h-28 w-full rounded-[16px] bg-muted/20" />
           <Skeleton className="h-28 w-full rounded-[16px] bg-muted/20" />
           <Skeleton className="h-28 w-full rounded-[16px] bg-muted/20" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="timeflow-container py-20 text-center text-muted-foreground">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Failed to load appointments</h2>
        <p className="mt-2 text-sm sm:text-base">Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="timeflow-container space-y-6 animate-in fade-in duration-500 py-6">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Calendar & Appointments</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage your schedule, upcoming sessions, and availability.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
          <button className="btn-secondary w-full sm:w-auto h-[44px]">
            Set Availability
          </button>
          <button className="btn-primary w-full sm:w-auto h-[44px] shadow-md">
            <Plus className="mr-2 h-4 w-4" /> New Session
          </button>
        </div>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full sm:w-[400px] grid-cols-2 mb-6 bg-card border border-border h-[48px] p-1 rounded-[12px]">
          <TabsTrigger value="upcoming" className="rounded-[8px] data-[state=active]:bg-accent data-[state=active]:text-foreground text-muted-foreground transition-all">
            Upcoming Sessions
          </TabsTrigger>
          <TabsTrigger value="past" className="rounded-[8px] data-[state=active]:bg-accent data-[state=active]:text-foreground text-muted-foreground transition-all">
            Past Sessions
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="space-y-8">
          {data.upcomingAppointments.map((dayGroup, index) => (
            <div key={index} className="space-y-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                {dayGroup.date}
              </h3>
              
              <div className="grid gap-4">
                {dayGroup.sessions.map((session) => (
                  <div key={session.id} className="enterprise-card p-0 overflow-hidden hover:border-primary/50 transition-colors group">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 gap-4">
                      
                      {/* Time & Modality */}
                      <div className="flex items-start sm:items-center gap-4 sm:gap-6 min-w-[200px]">
                        <div className="bg-card border border-border group-hover:border-primary/30 p-3 rounded-[10px] flex flex-col items-center justify-center shrink-0 transition-colors">
                          <Clock className="h-5 w-5 text-primary mb-1" />
                          <span className="text-sm font-bold text-foreground text-center w-full">
                            {session.time.split(' - ')[0]}
                          </span>
                        </div>
                        <div>
                          <div className="font-bold text-foreground text-lg group-hover:text-info transition-colors">{session.patientName}</div>
                          <div className="text-sm text-muted-foreground mt-0.5">{session.type}</div>
                          <div className="text-xs text-muted-foreground flex items-center mt-1 font-medium">
                            {session.modality === 'Telehealth' ? <Video className="h-3 w-3 mr-1" /> : <Users className="h-3 w-3 mr-1" />}
                            {session.modality}
                          </div>
                        </div>
                      </div>

                      {/* Status & Actions */}
                      <div className="flex flex-wrap items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                        {getStatusBadge(session.status)}
                        
                        <div className="flex items-center gap-2">
                          {session.modality === 'Telehealth' && session.status === 'CONFIRMED' && (
                            <button className="btn-primary h-9 px-4 text-xs shadow-md">
                              Start Video
                            </button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="btn-ghost h-9 w-9 p-0 opacity-80 group-hover:opacity-100 hover:text-foreground rounded-md">
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 border-border rounded-[12px] bg-card shadow-xl text-foreground">
                              <DropdownMenuItem className="cursor-pointer focus:bg-accent focus:text-foreground">View Chart</DropdownMenuItem>
                              <DropdownMenuItem className="cursor-pointer focus:bg-accent focus:text-foreground">Reschedule</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer font-medium transition-colors">Cancel Session</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="past">
          <div className="enterprise-card p-0 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border bg-card">
              <h2 className="text-lg font-bold text-foreground">Past Sessions</h2>
            </div>
            <div className="p-8 text-center text-muted-foreground bg-background">
              <p>Historical session data will appear here.</p>
            </div>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
