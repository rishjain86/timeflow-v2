'use client';

import React from 'react';
import { 
  Target, 
  Activity, 
  CheckCircle2, 
  Circle,
  Clock,
  Flag
} from 'lucide-react';

// Shadcn UI Components
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

// API Hook
import { useGetPatientTreatmentPlan } from '@/features/patient/api/get-patient-treatment-plan';

export default function PatientTreatmentPlanPage() {
  const { data, isLoading, isError } = useGetPatientTreatmentPlan();

  if (isLoading) {
    return (
      <div className="timeflow-container py-6 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-64 bg-muted/20" />
            <Skeleton className="h-4 w-96 mt-2 bg-muted/20" />
          </div>
          <Skeleton className="h-8 w-24 rounded-[8px] bg-muted/20" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            <Skeleton className="h-32 w-full rounded-[16px] bg-muted/20" />
            <Skeleton className="h-64 w-full rounded-[16px] bg-muted/20" />
          </div>
          <div className="space-y-6 md:space-y-8">
            <Skeleton className="h-40 w-full rounded-[16px] bg-muted/20" />
            <Skeleton className="h-80 w-full rounded-[16px] bg-muted/20" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="timeflow-container py-20 text-center text-muted-foreground">
        <p className="text-foreground text-lg font-medium">Failed to load treatment plan.</p>
        <p className="mt-1">Please try refreshing.</p>
      </div>
    );
  }

  return (
    <div className="timeflow-container space-y-6 md:space-y-8 animate-in fade-in duration-500 py-6">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">My Treatment Plan</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Track your therapeutic goals, milestones, and overall progress.
          </p>
        </div>
        <span className="badge-base badge-draft flex items-center px-4 py-2 text-sm shadow-sm">
          <Activity className="w-4 h-4 mr-2" /> Active Plan
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Main Column - Progress & Goals */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          
          {/* Overall Progress Card */}
          <div className="enterprise-card p-6 bg-primary/10 border-primary/20 hover:border-primary/50 transition-colors">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Overall Progress</h3>
                <p className="text-sm text-primary/80 mt-1">{data.currentPhase}</p>
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-primary">{data.overallProgress}%</div>
            </div>
            <Progress value={data.overallProgress} className="h-3 bg-background border border-border/50 [&>div]:bg-primary" />
          </div>

          {/* Clinical Goals */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-primary" />
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">Active Goals</h2>
            </div>
            
            <div className="grid gap-4">
              {data.goals.map((goal) => (
                <div key={goal.id} className="enterprise-card p-5 group hover:border-primary/30 transition-colors">
                  <div className="flex justify-between items-start mb-4 gap-4">
                    <div className="font-semibold text-foreground group-hover:text-info transition-colors">{goal.title}</div>
                    {goal.status === 'COMPLETED' ? (
                      <span className="badge-base badge-paid flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> Met
                      </span>
                    ) : (
                      <span className="badge-base badge-pending flex items-center gap-1 shrink-0">
                        <Clock className="h-3 w-3" /> In Progress
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={goal.progress} className={`h-2 flex-1 bg-card border border-border/50 ${goal.status === 'COMPLETED' ? '[&>div]:bg-success' : '[&>div]:bg-info'}`} />
                    <span className="text-xs font-bold text-foreground w-8 text-right">
                      {goal.progress}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Sidebar Column - Milestones & Info */}
        <div className="space-y-6 md:space-y-8">
          
          {/* Plan Info Details */}
          <div className="enterprise-card p-0 flex flex-col overflow-hidden">
            <div className="bg-card border-b border-border p-4">
              <h3 className="text-base font-bold text-foreground">Plan Details</h3>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1 font-medium">Primary Focus</p>
                <p className="font-semibold text-foreground">{data.diagnosis}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 font-medium">Started On</p>
                <p className="font-semibold text-muted-foreground">{data.startDate}</p>
              </div>
            </div>
          </div>

          {/* Milestones Timeline */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Flag className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold tracking-tight text-foreground">Milestones</h2>
            </div>
            
            <div className="enterprise-card p-5">
              <div className="space-y-6">
                {data.milestones.map((milestone, index) => (
                  <div key={milestone.id} className="relative flex gap-4">
                    {/* Vertical line connecting timeline dots */}
                    {index !== data.milestones.length - 1 && (
                      <div className="absolute left-2.5 top-6 bottom-[-24px] w-[2px] bg-border/50" />
                    )}
                    
                    <div className="relative z-15 bg-card mt-0.5">
                      {milestone.isDone ? (
                        <CheckCircle2 className="h-5 w-5 text-success bg-card" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground fill-card" />
                      )}
                    </div>
                    
                    <div>
                      <p className={`text-sm font-bold ${milestone.isDone ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {milestone.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{milestone.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
