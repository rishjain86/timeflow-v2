'use client';

import React from 'react';
import { DollarSign, FileText, AlertCircle, Clock } from 'lucide-react';

// Shadcn UI
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Hooks
import { useGetBillingMetrics } from '@/features/billing/api/get-billing-metrics';

// Helpers
const formatCurrency = (amount: number | string) => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(Number(amount));
};

export default function BillingDashboardPage() {
  const { data: metrics, isLoading } = useGetBillingMetrics();

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
        <Skeleton className="h-[400px] w-full mt-6 rounded-[16px] bg-muted/20" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="timeflow-container py-20 text-center">
        <h2 className="text-2xl font-semibold text-white">Failed to load dashboard metrics</h2>
        <p className="text-muted-foreground mt-2">Please check your connection and try again.</p>
      </div>
    );
  }

  // Calculate max revenue for dynamic chart bar heights
  const maxRevenue = metrics.monthlyRevenue?.length 
    ? Math.max(...metrics.monthlyRevenue.map(m => m.revenue)) 
    : 1;

  return (
    <div className="timeflow-container space-y-6 animate-in fade-in duration-500 py-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Billing Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Overview of your financial metrics and invoice statuses.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        <div className="enterprise-card flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Revenue</span>
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-[#0F172A] border border-border transition-colors group-hover:border-primary/50">
              <DollarSign className="h-4 w-4 text-success" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-white">{formatCurrency(metrics.totalRevenue)}</div>
            <p className="text-xs text-[#CBD5E1] mt-1">
              From {metrics.paidInvoices} paid invoices
            </p>
          </div>
        </div>

        <div className="enterprise-card flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-muted-foreground">Outstanding</span>
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-[#0F172A] border border-border transition-colors group-hover:border-info/50">
              <Clock className="h-4 w-4 text-info" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-white">{formatCurrency(metrics.outstandingAmount)}</div>
            <p className="text-xs text-[#CBD5E1] mt-1">
              Across {metrics.pendingInvoices} pending invoices
            </p>
          </div>
        </div>

        <div className="enterprise-card flex flex-col justify-between group relative overflow-hidden">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-muted-foreground">Overdue</span>
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-destructive/10 border border-destructive/20 transition-colors group-hover:bg-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <div className="text-2xl sm:text-3xl font-bold text-destructive">{metrics.overdueInvoices} Invoices</div>
            <p className="text-xs text-destructive/80 font-medium mt-1">
              Requires immediate attention
            </p>
          </div>
        </div>

        <div className="enterprise-card flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Issued</span>
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-[#0F172A] border border-border transition-colors group-hover:border-primary/50">
              <FileText className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-white">{metrics.totalInvoices}</div>
            <p className="text-xs text-[#CBD5E1] mt-1">
              Invoices generated lifetime
            </p>
          </div>
        </div>

      </div>

      {/* Native Tailwind Revenue Chart */}
      <div className="enterprise-card mt-6">
        <h3 className="font-bold text-white mb-6">Monthly Revenue</h3>
        <div className="h-[300px] sm:h-[350px] w-full pt-8 pb-4 flex flex-col justify-end border-b border-l border-border relative ml-4 sm:ml-10 pr-2">
          
          {/* Y-Axis Grid Lines & Labels */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-xs text-muted-foreground">
            <div className="flex items-center w-full border-t border-dashed border-border h-0 relative">
              <span className="absolute -left-10 sm:-left-12 -translate-y-1/2 bg-card pr-2">{formatCurrency(maxRevenue)}</span>
            </div>
            <div className="flex items-center w-full border-t border-dashed border-border/50 h-0 relative">
              <span className="absolute -left-10 sm:-left-12 -translate-y-1/2 bg-card pr-2">{formatCurrency(maxRevenue / 2)}</span>
            </div>
            <div className="flex items-center w-full border-t border-solid border-border h-0 relative">
              <span className="absolute -left-6 sm:-left-8 -translate-y-1/2 bg-card pr-2">$0</span>
            </div>
          </div>

          {/* Chart Bars */}
          {metrics.monthlyRevenue && metrics.monthlyRevenue.length > 0 ? (
            <div className="flex items-end justify-around w-full h-[220px] sm:h-[250px] relative z-10 px-2 sm:px-4">
              {metrics.monthlyRevenue.map((item) => {
                const heightPercentage = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
                
                return (
                  <div 
                    key={item.month} 
                    tabIndex={0}
                    className="flex flex-col items-center group relative h-full justify-end w-full max-w-[40px] sm:max-w-[60px] cursor-pointer outline-none"
                  >
                    {/* Tooltip (Visible on Hover/Touch/Focus) */}
                    <div className="opacity-0 group-hover:opacity-100 group-focus:opacity-100 active:opacity-100 transition-opacity absolute -top-12 bg-[#0F172A] border border-primary text-white font-medium text-xs py-1.5 px-2.5 rounded-lg z-20 whitespace-nowrap shadow-[0_0_15px_rgba(37,99,235,0.4)] pointer-events-none">
                      {formatCurrency(item.revenue)}
                    </div>
                    
                    {/* The Bar */}
                    <div 
                      style={{ height: `${heightPercentage}%` }} 
                      className="w-full bg-primary rounded-t-[6px] transition-all duration-300 group-hover:opacity-80 group-hover:shadow-[0_0_15px_rgba(37,99,235,0.4)] group-focus:opacity-80 min-h-[4px]"
                    />
                    
                    {/* X-Axis Label */}
                    <span className="text-[10px] sm:text-xs text-muted-foreground mt-3 absolute -bottom-8">
                      {item.month}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground relative z-10 text-sm">
              No revenue data available for the chart yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
