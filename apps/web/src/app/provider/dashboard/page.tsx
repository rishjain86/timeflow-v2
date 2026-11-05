'use client';

import React from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  AlertCircle,
  Video,
  ChevronRight,
  Activity
} from 'lucide-react';

// Shadcn UI Components
import { Skeleton } from '@/components/ui/skeleton';

// API Hook
import { useGetProviderDashboard } from '@/features/provider/api/get-provider-dashboard';

export default function ProviderDashboardPage() {
  const { data, isLoading, isError } = useGetProviderDashboard();

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <Skeleton className="h-32 w-full rounded-[16px] bg-muted/20" />
          <Skeleton className="h-32 w-full rounded-[16px] bg-muted/20" />
          <Skeleton className="h-32 w-full rounded-[16px] bg-muted/20" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <Skeleton className="h-96 lg:col-span-2 w-full rounded-[16px] bg-muted/20" />
          <Skeleton className="h-96 w-full rounded-[16px] bg-muted/20" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="timeflow-container py-20 text-center text-muted-foreground">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Failed to load dashboard</h2>
        <p className="mt-2 text-sm sm:text-base">Please check your connection and try again.</p>
      </div>
    );
  }

  return (
    <div className="timeflow-container space-y-6 md:space-y-8 animate-in fade-in duration-500 py-6">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Welcome, Dr. Emily</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Here's what's happening with your practice today.
          </p>
        </div>
        <button className="btn-primary shrink-0 h-[44px] shadow-md w-full sm:w-auto">
          <Calendar className="mr-2 h-4 w-4" /> View Full Schedule
        </button>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="enterprise-card flex flex-col justify-between group hover:border-primary/50 transition-colors">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-muted-foreground">Active Patients</span>
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-card border border-border group-hover:border-primary/50 transition-colors">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">{data.stats.totalPatients}</div>
            <p className="text-xs text-success mt-1 flex items-center font-medium">
              <Activity className="h-3 w-3 mr-1" /> +2 this month
            </p>
          </div>
        </div>
        
        <div className="enterprise-card flex flex-col justify-between group hover:border-info/50 transition-colors">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-muted-foreground">Sessions Today</span>
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-card border border-border group-hover:border-info/50 transition-colors">
              <Clock className="h-4 w-4 text-info" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">{data.stats.sessionsToday}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">First session at 10:00 AM</p>
          </div>
        </div>

        <div className="enterprise-card flex flex-col justify-between group bg-warning/10 border-warning/30 hover:border-warning/60 transition-colors">
          <div className="flex items-start justify-between">
            <span className="text-sm font-semibold text-warning">Pending Clinical Notes</span>
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-warning/20">
              <AlertCircle className="h-4 w-4 text-warning" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">{data.stats.pendingNotes}</div>
            <p className="text-xs text-warning/80 mt-1 font-medium">Action required before EOD</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Today's Schedule - Main Column */}
        <div className="enterprise-table-container lg:col-span-2 flex flex-col">
          <div className="p-4 sm:p-5 border-b border-border bg-card">
            <h2 className="text-lg font-bold text-foreground">Today's Schedule</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Your upcoming appointments for today.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="enterprise-table-header">
                <tr>
                  <th className="enterprise-table-head pl-6">Time</th>
                  <th className="enterprise-table-head">Patient</th>
                  <th className="enterprise-table-head">Session Details</th>
                  <th className="enterprise-table-head text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.todaysAppointments.length > 0 ? (
                  data.todaysAppointments.map((apt) => (
                    <tr key={apt.id} className="enterprise-table-row group hover:bg-accent/50 transition-colors">
                      <td className="enterprise-table-cell pl-6 font-mono font-bold text-foreground whitespace-nowrap">
                        {apt.time}
                      </td>
                      <td className="enterprise-table-cell font-bold text-foreground group-hover:text-info transition-colors">
                        {apt.patientName}
                      </td>
                      <td className="enterprise-table-cell">
                        <div className="text-sm font-semibold text-foreground">{apt.type}</div>
                        <div className="text-xs text-muted-foreground flex items-center mt-1 font-medium">
                          {apt.modality === 'Telehealth' ? <Video className="h-3 w-3 mr-1 text-info" /> : <Users className="h-3 w-3 mr-1 text-muted-foreground" />}
                          {apt.modality}
                        </div>
                      </td>
                      <td className="enterprise-table-cell text-right pr-6">
                        {apt.modality === 'Telehealth' ? (
                          <button className="btn-primary h-8 px-4 text-xs shadow-md">
                            Start Call
                          </button>
                        ) : (
                          <button className="btn-secondary h-8 px-3 text-xs text-muted-foreground hover:text-foreground">
                            View Chart
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="h-32 text-center text-muted-foreground bg-background">
                      No appointments scheduled for today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Patient Alerts - Sidebar */}
        <div className="enterprise-card p-0 flex flex-col overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border bg-card flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <h2 className="text-base font-bold text-foreground">Patient Alerts</h2>
          </div>
          <div className="divide-y divide-border overflow-y-auto max-h-[400px] custom-scrollbar">
            {data.patientAlerts.length > 0 ? (
              data.patientAlerts.map((alert) => (
                <div key={alert.id} className="p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-sm text-foreground">{alert.patientName}</span>
                    <span className="text-xs text-muted-foreground">{alert.date}</span>
                  </div>
                  <p className={`text-sm ${alert.severity === 'high' ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                    {alert.alert}
                  </p>
                  <button className="flex items-center text-xs font-semibold mt-2 text-info hover:text-foreground transition-colors">
                    View Details <ChevronRight className="h-3 w-3 ml-1" />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground bg-background">
                No active alerts.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
