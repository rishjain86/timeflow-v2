'use client';

import React from 'react';
import { ShieldCheck, Layers, Activity, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

// Shadcn UI Components
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

// API Hook
import { useGetAuthorizationUtilization } from '@/features/authorizations/api/get-authorization-utilization';

// Helpers
const calculatePercentage = (used: number, total: number) => {
  if (total === 0) return 0;
  return Math.min(Math.round((used / total) * 100), 100);
};

const getProgressBarColor = (percentage: number) => {
  if (percentage >= 90) return 'bg-destructive shadow-md';
  if (percentage >= 75) return 'bg-warning shadow-md';
  return 'bg-primary shadow-md';
};

const getDaysUntilExpiry = (expiryDate: string) => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export default function AuthorizationDashboardPage() {
  const { data: metrics, isLoading } = useGetAuthorizationUtilization();

  if (isLoading) {
    return (
      <div className="timeflow-container py-6 space-y-6">
        <div>
          <Skeleton className="h-10 w-80 bg-muted/20" />
          <Skeleton className="h-4 w-96 mt-2 bg-muted/20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-[16px] bg-muted/20" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full mt-6 rounded-[16px] bg-muted/20" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="timeflow-container py-20 text-center text-muted-foreground">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Failed to load utilization data</h2>
        <p className="mt-2 text-sm sm:text-base">Please check your connection and try again.</p>
      </div>
    );
  }

  return (
    <div className="timeflow-container space-y-6 animate-in fade-in duration-500 py-6">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Authorization Utilization</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Monitor active therapy authorizations, unit consumption, and upcoming expirations.
          </p>
        </div>
        <Link href="/authorizations" className="btn-secondary w-full sm:w-auto shrink-0 flex items-center justify-center">
          View All Authorizations <ArrowRight className="ml-2 w-4 h-4" />
        </Link>
      </div>

      {/* Overview KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="enterprise-card flex flex-col justify-between group hover:border-primary/50 transition-colors">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-muted-foreground">Active Authorizations</span>
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-card border border-border group-hover:border-primary/50 transition-colors">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">{metrics.totalActiveAuthorizations}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently valid across all clients</p>
          </div>
        </div>

        <div className="enterprise-card flex flex-col justify-between group hover:border-info/50 transition-colors">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Approved Units</span>
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-card border border-border group-hover:border-info/50 transition-colors">
              <Layers className="h-4 w-4 text-info" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">{metrics.totalApprovedUnits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Total units available to bill</p>
          </div>
        </div>

        <div className="enterprise-card flex flex-col justify-between group hover:border-warning/50 transition-colors">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-muted-foreground">Units Consumed</span>
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-card border border-border group-hover:border-warning/50 transition-colors">
              <Activity className="h-4 w-4 text-warning" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">{metrics.totalUsedUnits.toLocaleString()}</div>
            <Progress value={metrics.overallUtilizationPercentage} className="h-1.5 mt-2.5 bg-background border border-border/50 [&>div]:bg-warning" />
            <p className="text-xs text-muted-foreground mt-2">
              <span className="font-semibold text-foreground">{metrics.overallUtilizationPercentage}%</span> of total units utilized
            </p>
          </div>
        </div>

        <div className="enterprise-card flex flex-col justify-between group hover:border-success/50 transition-colors">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-muted-foreground">Units Remaining</span>
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-card border border-border group-hover:border-success/50 transition-colors">
              <Clock className="h-4 w-4 text-success" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">{metrics.totalRemainingUnits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Available for upcoming sessions</p>
          </div>
        </div>
      </div>

      {/* Action Required: Expiring or High Utilization Authorizations */}
      <div className="enterprise-table-container flex flex-col border border-destructive/35 shadow-md">
        <div className="p-4 sm:p-5 border-b border-border bg-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Action Required: Critical Authorizations</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Expiring within 30 days or over 85% units consumed.</p>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="enterprise-table-header">
              <tr>
                <th className="enterprise-table-head pl-6">Client</th>
                <th className="enterprise-table-head">Auth #</th>
                <th className="enterprise-table-head w-[30%]">Unit Utilization</th>
                <th className="enterprise-table-head">Expiry Date</th>
                <th className="enterprise-table-head text-right pr-6">Alert</th>
              </tr>
            </thead>
            <tbody>
              {metrics.expiringAuthorizations && metrics.expiringAuthorizations.length > 0 ? (
                metrics.expiringAuthorizations.map((auth) => {
                  const usagePercentage = calculatePercentage(auth.usedUnits, auth.totalUnits);
                  const daysToExpiry = getDaysUntilExpiry(auth.expiryDate);
                  
                  let alertType = '';
                  if (daysToExpiry <= 14) alertType = 'EXPIRING_SOON';
                  else if (usagePercentage >= 90) alertType = 'CRITICAL_UNITS';
                  else if (daysToExpiry <= 30) alertType = 'EXPIRING_MONTH';
                  else alertType = 'HIGH_USAGE';

                  return (
                    <tr key={auth.id} className="enterprise-table-row group hover:bg-accent/50 transition-colors">
                      <td className="enterprise-table-cell pl-6 font-bold">
                        <Link href={`/clients/${auth.clientId}`} className="text-foreground hover:text-info transition-colors">
                          {auth.clientName}
                        </Link>
                      </td>
                      <td className="enterprise-table-cell text-muted-foreground font-mono text-sm">
                        {auth.authorizationNumber}
                      </td>
                      <td className="enterprise-table-cell">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-foreground">{auth.usedUnits} <span className="text-muted-foreground">used</span></span>
                            <span className="text-foreground">{auth.totalUnits} <span className="text-muted-foreground">total</span></span>
                          </div>
                          <div className="h-1.5 w-full bg-background border border-border/50 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 rounded-full ${getProgressBarColor(usagePercentage)}`}
                              style={{ width: `${usagePercentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="enterprise-table-cell">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{new Date(auth.expiryDate).toLocaleDateString()}</span>
                          <span className={`text-xs mt-0.5 font-medium ${daysToExpiry <= 14 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {daysToExpiry > 0 ? `In ${daysToExpiry} days` : 'Expired'}
                          </span>
                        </div>
                      </td>
                      <td className="enterprise-table-cell text-right pr-6">
                        {alertType === 'EXPIRING_SOON' && (
                          <span className="badge-base badge-cancelled">Expiring &lt; 14 Days</span>
                        )}
                        {alertType === 'CRITICAL_UNITS' && (
                          <span className="badge-base badge-cancelled">&gt; 90% Used</span>
                        )}
                        {alertType === 'EXPIRING_MONTH' && (
                          <span className="badge-base bg-warning/20 text-warning border border-warning/30">
                            Expiring &lt; 30 Days
                          </span>
                        )}
                        {alertType === 'HIGH_USAGE' && (
                          <span className="badge-base bg-warning/10 text-warning border border-warning/20">
                            High Usage
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="h-48 text-center text-muted-foreground bg-background">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-12 w-12 bg-success/10 rounded-full flex items-center justify-center mb-3">
                        <ShieldCheck className="h-6 w-6 text-success" />
                      </div>
                      <p className="text-foreground font-bold text-base">All authorizations are healthy.</p>
                      <p className="text-sm mt-1">No critical expirations or unit limits approaching.</p>
                    </div>
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
