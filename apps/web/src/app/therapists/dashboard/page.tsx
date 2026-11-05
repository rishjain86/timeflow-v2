'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Calendar as CalendarIcon, Clock, CheckCircle, User, PlayCircle, FileText, ArrowRight } from 'lucide-react';

// Shadcn UI Components
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

// API Hook
import { useGetTherapistDashboard, AppointmentStatus, DashboardAppointment } from '@/features/therapists/api/get-therapist-dashboard';

// Sprint 6: Appointment Modal for Compliance & Status updates
// import { AppointmentModal } from '@/components/appointments/AppointmentModal'; 

// Helpers
const formatTime = (isoString: string) => {
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (isoString: string) => {
  return new Date(isoString).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

const renderStatusBadge = (status: AppointmentStatus) => {
  switch (status) {
    case 'COMPLETED':
      return <span className="badge-base badge-paid">Completed</span>;
    case 'IN_PROGRESS':
      return <span className="badge-base badge-info">In Progress</span>;
    case 'CANCELLED': 
    case 'NO_SHOW':
      return <span className="badge-base badge-cancelled">{status.replace('_', ' ')}</span>;
    case 'SCHEDULED': 
    default:
      return <span className="badge-base badge-pending">Scheduled</span>;
  }
};

export default function TherapistDashboardPage() {
  const { data: dashboard, isLoading } = useGetTherapistDashboard();
  
  // SPRINT 6: State to manage the appointment modal
  const [selectedAptId, setSelectedAptId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="timeflow-container py-6 space-y-6">
        <div>
          <Skeleton className="h-10 w-64 bg-muted/20" />
          <Skeleton className="h-4 w-96 mt-2 bg-muted/20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-[16px] bg-muted/20" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mt-6">
          <Skeleton className="h-[400px] w-full rounded-[16px] bg-muted/20" />
          <Skeleton className="h-[400px] w-full rounded-[16px] bg-muted/20" />
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="timeflow-container py-20 text-center text-muted-foreground">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Failed to load dashboard</h2>
        <p className="mt-2 text-sm sm:text-base">Please check your connection and try again.</p>
      </div>
    );
  }

  const { metrics, todayAppointments, upcomingAppointments } = dashboard;

  return (
    <div className="timeflow-container space-y-6 animate-in fade-in duration-500 py-6">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Welcome, {dashboard.therapistName}</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Here is your schedule and productivity overview for this week.
          </p>
        </div>
        <Link href="/calendar" className="btn-primary w-full sm:w-auto shrink-0 flex items-center justify-center">
          <CalendarIcon className="mr-2 h-4 w-4" /> View Full Calendar
        </Link>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="enterprise-card flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-muted-foreground">Weekly Hours</span>
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-card border border-border group-hover:border-primary/50 transition-colors">
              <Clock className="h-4 w-4 text-info" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">
              {metrics.weeklyHoursLogged} <span className="text-sm text-muted-foreground font-medium">/ {metrics.targetWeeklyHours} hrs</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Logged vs Target</p>
          </div>
        </div>

        <div className="enterprise-card flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-muted-foreground">Productivity</span>
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-card border border-border group-hover:border-primary/50 transition-colors">
              <CheckCircle className="h-4 w-4 text-success" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">{metrics.productivityPercentage}%</div>
            <Progress value={metrics.productivityPercentage} className="h-1.5 mt-2.5 bg-background border border-border/50 [&>div]:bg-success" />
            <p className="text-xs text-muted-foreground mt-2 font-medium">Target achievement</p>
          </div>
        </div>

        <div className="enterprise-card flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-muted-foreground">Completed Sessions</span>
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-card border border-border group-hover:border-primary/50 transition-colors">
              <FileText className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">{metrics.completedSessionsThisWeek}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Sessions finalized this week</p>
          </div>
        </div>

        <div className="enterprise-card flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-muted-foreground">Today's Load</span>
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-card border border-border group-hover:border-primary/50 transition-colors">
              <User className="h-4 w-4 text-warning" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">{todayAppointments.length}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Appointments scheduled today</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Today's Schedule */}
        <div className="enterprise-card flex flex-col p-0 overflow-hidden h-[500px]">
          <div className="p-5 border-b border-border bg-card shrink-0">
            <h2 className="text-lg font-bold text-foreground">Today's Appointments</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Your schedule for today.</p>
          </div>
          <div className="p-5 overflow-y-auto custom-scrollbar flex-1 bg-background">
            {todayAppointments.length > 0 ? (
              <div className="space-y-4">
                {todayAppointments.map((apt: DashboardAppointment) => (
                  <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-[12px] bg-card hover:bg-accent/50 transition-colors gap-4 group">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="font-bold text-foreground group-hover:text-info transition-colors text-base">{apt.clientName}</span>
                        {renderStatusBadge(apt.status)}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /> {formatTime(apt.startTime)} - {formatTime(apt.endTime)}</span>
                        <span className="flex items-center"><FileText className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /> {apt.serviceType}</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex justify-end">
                      {/* SPRINT 6: Trigger Appointment Modal */}
                      {apt.status === 'SCHEDULED' && (
                        <button 
                          onClick={() => setSelectedAptId(apt.id)}
                          className="btn-secondary h-9 px-4 text-sm w-full sm:w-auto text-primary border-primary/50 hover:bg-primary/10 hover:border-primary transition-colors flex items-center justify-center"
                        >
                          <PlayCircle className="w-4 h-4 mr-1.5" /> Check In
                        </button>
                      )}
                      {apt.status === 'IN_PROGRESS' && (
                        <button 
                          onClick={() => setSelectedAptId(apt.id)}
                          className="btn-primary h-9 px-4 text-sm w-full sm:w-auto shadow-md"
                        >
                          Manage Session
                        </button>
                      )}
                      {apt.status === 'COMPLETED' && (
                        <Link href={`/appointments/${apt.id}`} className="btn-ghost h-9 px-4 text-sm w-full sm:w-auto text-info hover:text-foreground flex items-center justify-center">
                          View Details
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-[12px]">
                <CalendarIcon className="w-8 h-8 mb-3 text-primary opacity-50" />
                <p className="text-foreground font-medium">No appointments scheduled for today.</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="enterprise-table-container flex flex-col h-[500px]">
          <div className="p-5 border-b border-border flex justify-between items-center bg-card shrink-0">
            <div>
              <h2 className="text-lg font-bold text-foreground">Upcoming</h2>
              <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">Next few appointments this week.</p>
            </div>
            <Link href="/calendar" className="btn-ghost h-9 px-3 text-sm text-info hover:text-foreground flex items-center shrink-0">
              View All <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </div>
          <div className="overflow-y-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead className="enterprise-table-header sticky top-0 z-10">
                <tr>
                  <th className="enterprise-table-head pl-6">Date & Time</th>
                  <th className="enterprise-table-head">Client</th>
                  <th className="enterprise-table-head">Service</th>
                  <th className="enterprise-table-head pr-6">Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingAppointments.length > 0 ? (
                  upcomingAppointments.map((apt: DashboardAppointment) => (
                    <tr key={apt.id} className="enterprise-table-row group cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setSelectedAptId(apt.id)}>
                      <td className="enterprise-table-cell pl-6">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{formatDate(apt.startTime)}</span>
                          <span className="text-xs text-muted-foreground mt-0.5">{formatTime(apt.startTime)}</span>
                        </div>
                      </td>
                      <td className="enterprise-table-cell font-bold">
                        <span className="text-foreground group-hover:text-info transition-colors">
                          {apt.clientName}
                        </span>
                      </td>
                      <td className="enterprise-table-cell text-sm text-muted-foreground">{apt.serviceType}</td>
                      <td className="enterprise-table-cell pr-6">{renderStatusBadge(apt.status)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="h-32 text-center text-muted-foreground bg-background">
                      No upcoming appointments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* SPRINT 6: Appointment Compliance & Status Management Modal */}
      {/* 
      {selectedAptId && (
        <AppointmentModal 
          isOpen={!!selectedAptId} 
          onClose={() => setSelectedAptId(null)} 
          appointmentId={selectedAptId} 
        />
      )} 
      */}
    </div>
  );
}
