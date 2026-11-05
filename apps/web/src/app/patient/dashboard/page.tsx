'use client';

import React from 'react';
import { 
  Calendar, 
  Video, 
  FileText, 
  Clock, 
  ArrowRight, 
  Activity, 
  PlusCircle,
  CreditCard
} from 'lucide-react';

// Shadcn UI Components
import { Skeleton } from '@/components/ui/skeleton';

// API Hook
import { useGetPatientDashboard } from '@/features/patient/api/get-patient-dashboard';

export default function PatientDashboardPage() {
  const { data, isLoading, isError } = useGetPatientDashboard();

  if (isLoading) {
    return (
      <div className="timeflow-container py-6 space-y-8">
        <Skeleton className="h-24 w-full rounded-[16px] bg-muted/20" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div className="md:col-span-2 space-y-6 md:space-y-8">
            <Skeleton className="h-48 w-full rounded-[16px] bg-muted/20" />
            <Skeleton className="h-32 w-full rounded-[16px] bg-muted/20" />
          </div>
          <Skeleton className="h-[400px] w-full rounded-[16px] bg-muted/20" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="timeflow-container py-20 text-center text-muted-foreground">
        <p className="text-foreground text-lg font-medium">Failed to load dashboard data.</p>
        <p className="mt-1">Please try refreshing.</p>
      </div>
    );
  }

  return (
    <div className="timeflow-container space-y-6 md:space-y-8 animate-in fade-in duration-500 py-6">
      
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-[16px] border border-border shadow-md">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {data.patientName}! 👋
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-lg">
            Here is your health overview and upcoming schedule.
          </p>
        </div>
        <button className="btn-primary shrink-0 rounded-full px-6 shadow-md w-full sm:w-auto h-[44px]">
          <PlusCircle className="mr-2 h-5 w-5" /> Book Appointment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        
        {/* Main Column - Upcoming Appointment & Activity */}
        <div className="md:col-span-2 space-y-6 md:space-y-8">
          
          <section>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight mb-4 text-foreground">Your Next Appointment</h2>
            
            {data.upcomingAppointment ? (
              <div className="enterprise-card p-0 overflow-hidden border-l-4 border-l-primary group flex flex-col">
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-foreground group-hover:text-info transition-colors">{data.upcomingAppointment.type}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">with {data.upcomingAppointment.providerName}</p>
                    </div>
                    <span className="badge-base badge-draft">
                      {data.upcomingAppointment.modality}
                    </span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-8 text-sm mt-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">{data.upcomingAppointment.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">{data.upcomingAppointment.time}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 border-t border-border p-4 flex flex-col sm:flex-row justify-end gap-3 mt-auto">
                  <button className="btn-secondary w-full sm:w-auto">Reschedule</button>
                  <button className="btn-primary w-full sm:w-auto shadow-md">
                    <Video className="mr-2 h-4 w-4 fill-current" /> Join Session
                  </button>
                </div>
              </div>
            ) : (
              <div className="enterprise-card p-8 border-dashed flex flex-col items-center justify-center text-center">
                <div className="h-16 w-16 bg-accent rounded-full flex items-center justify-center mb-4">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <p className="text-foreground font-medium">No upcoming appointments scheduled.</p>
                <button className="text-info hover:text-foreground mt-2 text-sm font-semibold transition-colors">Book a session now</button>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight mb-4 text-foreground">Recent Invoices</h2>
            <div className="enterprise-card p-0 overflow-hidden">
                {data.recentInvoices.length > 0 ? (
                  <div className="divide-y divide-border">
                    {data.recentInvoices.map((invoice) => (
                      <div key={invoice.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 hover:bg-accent/50 transition-colors gap-4">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-background border border-border rounded-full flex items-center justify-center shrink-0">
                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{invoice.description}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{invoice.dueDate}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                          <span className="font-bold font-mono text-foreground">${invoice.amount.toFixed(2)}</span>
                          {invoice.status === 'PENDING' ? (
                            <button className="btn-secondary h-8 px-4 text-xs shrink-0">Pay Now</button>
                          ) : (
                            <span className="badge-base badge-paid">Paid</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No recent invoices found.
                  </div>
                )}
            </div>
          </section>

        </div>

        {/* Sidebar Column - Quick Links */}
        <div className="space-y-6">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">Quick Links</h2>
          
          <div className="grid gap-3">
            <div className="enterprise-card p-4 flex items-center justify-between cursor-pointer group hover:border-primary/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-warning/20 border border-warning/30 text-warning rounded-full flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-foreground group-hover:text-info transition-colors">My Documents</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>

            <div className="enterprise-card p-4 flex items-center justify-between cursor-pointer group hover:border-primary/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-success/20 border border-success/30 text-success rounded-full flex items-center justify-center">
                    <Activity className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-foreground group-hover:text-info transition-colors">Treatment Plan</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            
            <div className="enterprise-card p-4 flex items-center justify-between cursor-pointer group hover:border-primary/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-info/20 border border-info/30 text-info rounded-full flex items-center justify-center">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-foreground group-hover:text-info transition-colors">Appointment History</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
