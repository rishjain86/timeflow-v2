'use client';

import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CheckCircle, 
  Activity, 
  DollarSign 
} from 'lucide-react';

// Shadcn UI Components
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

// API Hook
import { useGetAnalytics, GetAnalyticsParams } from '@/features/analytics/api/get-analytics';

// Helpers
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(amount);
};

const renderGrowth = (growth: number) => {
  const isPositive = growth >= 0;
  return (
    <span className={`flex items-center text-xs mt-1 font-medium ${isPositive ? 'text-success' : 'text-destructive'}`}>
      {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
      {Math.abs(growth)}% from previous period
    </span>
  );
};

export default function AnalyticsDashboardPage() {
  const [period, setPeriod] = useState<GetAnalyticsParams['period']>('30d');

  const { data: metrics, isLoading } = useGetAnalytics({ period });

  if (isLoading) {
    return (
      <div className="timeflow-container py-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64 bg-muted/20" />
          <Skeleton className="h-[44px] w-[180px] rounded-[10px] bg-muted/20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-[16px] bg-muted/20" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mt-6">
          <Skeleton className="h-[350px] w-full rounded-[16px] bg-muted/20" />
          <Skeleton className="h-[350px] w-full rounded-[16px] bg-muted/20" />
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="timeflow-container py-20 text-center text-muted-foreground">
        <h2 className="text-xl sm:text-2xl font-bold text-white">Failed to load analytics</h2>
        <p className="mt-2 text-sm sm:text-base">Please check your connection and try again.</p>
      </div>
    );
  }

  // Calculate Max Values for Native CSS Charts
  const maxRevenue = metrics.revenueTrends?.length 
    ? Math.max(...metrics.revenueTrends.map(t => t.value)) 
    : 1;
    
  const maxUtilization = metrics.utilizationTrends?.length 
    ? Math.max(...metrics.utilizationTrends.map(t => t.value)) 
    : 100;

  return (
    <div className="timeflow-container space-y-6 animate-in fade-in duration-500 py-6">
      
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Analytics & Reports</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Clinic performance, financial trends, and utilization metrics.
          </p>
        </div>
        
        <Select value={period} onValueChange={(val: GetAnalyticsParams['period']) => setPeriod(val)}>
          <SelectTrigger className="w-full sm:w-[180px] h-[44px] bg-[#0F172A] border-border text-white rounded-[10px] focus:ring-primary transition-all shadow-sm">
            <SelectValue placeholder="Select Period" />
          </SelectTrigger>
          <SelectContent className="bg-[#0F172A] border-border text-white rounded-[12px] shadow-xl">
            <SelectItem value="7d" className="focus:bg-[#172554] focus:text-white cursor-pointer">Last 7 Days</SelectItem>
            <SelectItem value="30d" className="focus:bg-[#172554] focus:text-white cursor-pointer">Last 30 Days</SelectItem>
            <SelectItem value="90d" className="focus:bg-[#172554] focus:text-white cursor-pointer">Last Quarter (90d)</SelectItem>
            <SelectItem value="12m" className="focus:bg-[#172554] focus:text-white cursor-pointer">Last 12 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="enterprise-card flex flex-col justify-between group hover:border-primary/50 transition-colors">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Revenue</span>
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-[#0F172A] border border-border group-hover:border-primary/50 transition-colors">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-white">{formatCurrency(metrics.totalRevenue)}</div>
            {renderGrowth(metrics.revenueGrowth)}
          </div>
        </div>

        <div className="enterprise-card flex flex-col justify-between group hover:border-info/50 transition-colors">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-muted-foreground">Active Clients</span>
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-[#0F172A] border border-border group-hover:border-info/50 transition-colors">
              <Users className="h-4 w-4 text-info" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-white">{metrics.activeClients}</div>
            {renderGrowth(metrics.clientGrowth)}
          </div>
        </div>

        <div className="enterprise-card flex flex-col justify-between group hover:border-success/50 transition-colors">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-muted-foreground">Completion Rate</span>
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-[#0F172A] border border-border group-hover:border-success/50 transition-colors">
              <CheckCircle className="h-4 w-4 text-success" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-white">{metrics.appointmentCompletionRate}%</div>
            <p className="text-xs text-[#CBD5E1] mt-1">Scheduled vs Completed</p>
          </div>
        </div>

        <div className="enterprise-card flex flex-col justify-between group hover:border-warning/50 transition-colors">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-muted-foreground">Therapist Utilization</span>
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-[#0F172A] border border-border group-hover:border-warning/50 transition-colors">
              <Activity className="h-4 w-4 text-warning" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-white">{metrics.therapistUtilizationRate}%</div>
            <p className="text-xs text-[#CBD5E1] mt-1">Billable hrs vs Availability</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Revenue Trend Chart */}
        <div className="enterprise-card p-0 flex flex-col overflow-hidden h-[350px]">
          <div className="p-5 border-b border-border bg-[#0F172A] shrink-0">
            <h2 className="text-lg font-bold text-white">Revenue Trend</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Financial performance over selected period.</p>
          </div>
          <div className="flex-1 p-5 pb-8">
            <div className="h-full w-full flex flex-col justify-end border-b border-l border-border/50 relative">
              <div className="flex items-end justify-around w-full h-full relative z-10 px-2">
                {metrics.revenueTrends?.map((item) => {
                  const height = maxRevenue > 0 ? (item.value / maxRevenue) * 100 : 0;
                  return (
                    <div key={item.label} tabIndex={0} className="flex flex-col items-center group relative h-full justify-end w-full max-w-[40px] outline-none">
                      <div className="opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity absolute -top-12 left-1/2 -translate-x-1/2 bg-[#0F172A] border border-primary text-white font-medium text-xs py-1.5 px-2.5 rounded-lg z-20 whitespace-nowrap shadow-[0_0_15px_rgba(37,99,235,0.4)] pointer-events-none">
                        {formatCurrency(item.value)}
                      </div>
                      <div style={{ height: `${height}%` }} className="w-full bg-primary rounded-t-[4px] transition-all duration-300 min-h-[2px] group-hover:brightness-110 shadow-[0_0_10px_rgba(37,99,235,0.2)]" />
                      <span className="text-[10px] text-muted-foreground mt-2 absolute -bottom-6 truncate w-full text-center">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Utilization Trend Chart */}
        <div className="enterprise-card p-0 flex flex-col overflow-hidden h-[350px]">
          <div className="p-5 border-b border-border bg-[#0F172A] shrink-0">
            <h2 className="text-lg font-bold text-white">Utilization Trend</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Clinic-wide therapist productivity.</p>
          </div>
          <div className="flex-1 p-5 pb-8">
            <div className="h-full w-full flex flex-col justify-end border-b border-l border-border/50 relative">
              
              {/* Reference line for target utilization (e.g., 80%) */}
              <div className="absolute top-[20%] left-0 right-0 border-t border-dashed border-success/50 z-0">
                <span className="absolute -top-5 right-0 text-[10px] text-success font-medium">80% Target</span>
              </div>

              <div className="flex items-end justify-around w-full h-full relative z-10 px-2">
                {metrics.utilizationTrends?.map((item) => {
                  const height = maxUtilization > 0 ? (item.value / maxUtilization) * 100 : 0;
                  const isBelowTarget = item.value < 80;
                  return (
                    <div key={item.label} tabIndex={0} className="flex flex-col items-center group relative h-full justify-end w-full max-w-[40px] outline-none">
                      <div className="opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity absolute -top-12 left-1/2 -translate-x-1/2 bg-[#0F172A] border border-primary text-white font-medium text-xs py-1.5 px-2.5 rounded-lg z-20 whitespace-nowrap shadow-[0_0_15px_rgba(37,99,235,0.4)] pointer-events-none">
                        {item.value}%
                      </div>
                      <div style={{ height: `${height}%` }} className={`w-full rounded-t-[4px] transition-all duration-300 min-h-[2px] group-hover:brightness-110 ${isBelowTarget ? 'bg-warning shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-success shadow-[0_0_10px_rgba(34,197,94,0.2)]'}`} />
                      <span className="text-[10px] text-muted-foreground mt-2 absolute -bottom-6 truncate w-full text-center">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
