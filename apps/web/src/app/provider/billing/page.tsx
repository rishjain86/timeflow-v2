'use client';

import React from 'react';
import { 
  TrendingUp, 
  Clock, 
  Download,
  FileText,
  Plus,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

// Shadcn UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

// API Hook
import { useGetProviderBilling } from '@/features/provider/api/get-provider-billing';

// Helper for Invoice Badges
const getInvoiceBadge = (status: string) => {
  switch (status) {
    case 'PAID':
      return <span className="badge-base badge-paid"><CheckCircle2 className="w-3 h-3 mr-1" /> Paid</span>;
    case 'PENDING':
      return <span className="badge-base badge-pending"><Clock className="w-3 h-3 mr-1" /> Pending</span>;
    case 'OVERDUE':
      return <span className="badge-base badge-overdue"><AlertCircle className="w-3 h-3 mr-1" /> Overdue</span>;
    default:
      return <span className="badge-base badge-draft">{status}</span>;
  }
};

export default function ProviderBillingPage() {
  const { data, isLoading, isError } = useGetProviderBilling();

  if (isLoading) {
    return (
      <div className="timeflow-container py-6 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Skeleton className="h-10 w-64 bg-muted/20" />
            <Skeleton className="h-4 w-80 mt-2 bg-muted/20" />
          </div>
          <Skeleton className="h-[44px] w-40 rounded-[10px] bg-muted/20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <Skeleton className="h-32 w-full rounded-[16px] bg-muted/20" />
          <Skeleton className="h-32 w-full rounded-[16px] bg-muted/20" />
          <Skeleton className="h-32 w-full rounded-[16px] bg-muted/20" />
        </div>
        <Skeleton className="h-[48px] w-full sm:w-[400px] rounded-[12px] mb-6 bg-muted/20" />
        <div className="enterprise-card p-0 overflow-hidden">
          <div className="p-5 border-b border-border bg-card">
            <Skeleton className="h-6 w-48 mb-2 bg-muted/20" />
            <Skeleton className="h-4 w-96 bg-muted/20" />
          </div>
          <div className="p-6">
            <Skeleton className="h-64 w-full bg-muted/20" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="timeflow-container py-20 text-center text-muted-foreground">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Failed to load billing data</h2>
        <p className="mt-2 text-sm sm:text-base">Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="timeflow-container space-y-6 animate-in fade-in duration-500 py-6">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Billing & Earnings</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Track your revenue, manage invoices, and bill completed sessions.
          </p>
        </div>
        <button className="btn-secondary shrink-0 w-full sm:w-auto h-[44px]">
          <Download className="mr-2 h-4 w-4" /> Export Report
        </button>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="enterprise-card flex flex-col justify-between group hover:border-success/50 transition-colors">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-muted-foreground">Earnings (This Month)</span>
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-card border border-border group-hover:border-success/50 transition-colors">
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">{data.stats.totalEarningsMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">Updated today</p>
          </div>
        </div>
        
        <div className="enterprise-card flex flex-col justify-between group hover:border-info/50 transition-colors">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-muted-foreground">Pending Payouts</span>
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-card border border-border group-hover:border-info/50 transition-colors">
              <Clock className="h-4 w-4 text-info" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">{data.stats.pendingPayouts}</div>
            <p className="text-xs text-muted-foreground mt-1">From pending invoices</p>
          </div>
        </div>

        <div className="enterprise-card flex flex-col justify-between group bg-warning/10 border-warning/30 hover:border-warning/60 transition-colors">
          <div className="flex items-start justify-between">
            <span className="text-sm font-semibold text-warning">Unbilled Sessions</span>
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-warning/20">
              <FileText className="h-4 w-4 text-warning" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">{data.stats.unbilledSessionsCount}</div>
            <p className="text-xs text-warning/80 mt-1 font-medium">Ready for invoicing</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="invoices" className="w-full">
        <TabsList className="grid w-full sm:w-[400px] grid-cols-2 mb-6 bg-card border border-border h-[48px] p-1 rounded-[12px]">
          <TabsTrigger value="invoices" className="rounded-[8px] data-[state=active]:bg-accent data-[state=active]:text-foreground text-muted-foreground transition-all">
            Invoices
          </TabsTrigger>
          <TabsTrigger value="unbilled" className="rounded-[8px] data-[state=active]:bg-accent data-[state=active]:text-foreground text-muted-foreground transition-all flex items-center justify-center gap-2">
            Unbilled Sessions
            <span className="badge-base bg-warning/20 text-warning border border-warning/30 px-1.5 py-0.2 text-[10px]">{data.stats.unbilledSessionsCount}</span>
          </TabsTrigger>
        </TabsList>
        
        {/* INVOICES TAB */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="enterprise-table-container flex flex-col">
            <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card">
              <div>
                <h2 className="text-lg font-bold text-foreground">Generated Invoices</h2>
                <p className="text-sm text-muted-foreground mt-0.5">All your historical and active invoices.</p>
              </div>
              <button className="btn-primary h-9 px-4 text-xs shadow-md flex items-center shrink-0">
                <Plus className="mr-2 h-4 w-4" /> Create Custom Invoice
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="enterprise-table-header">
                  <tr>
                    <th className="enterprise-table-head pl-6">Invoice ID</th>
                    <th className="enterprise-table-head">Date</th>
                    <th className="enterprise-table-head">Patient</th>
                    <th className="enterprise-table-head text-right">Amount</th>
                    <th className="enterprise-table-head">Status</th>
                    <th className="enterprise-table-head text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.length > 0 ? (
                    data.invoices.map((invoice) => (
                      <tr key={invoice.id} className="enterprise-table-row group hover:bg-accent/50 transition-colors">
                        <td className="enterprise-table-cell pl-6 font-bold text-info group-hover:text-foreground transition-colors font-mono">
                          {invoice.id}
                        </td>
                        <td className="enterprise-table-cell text-sm text-muted-foreground">
                          {invoice.date}
                        </td>
                        <td className="enterprise-table-cell text-sm font-semibold text-foreground">
                          {invoice.patientName}
                        </td>
                        <td className="enterprise-table-cell text-right font-mono font-bold text-foreground">
                          {invoice.amount}
                        </td>
                        <td className="enterprise-table-cell">
                          {getInvoiceBadge(invoice.status)}
                        </td>
                        <td className="enterprise-table-cell text-right pr-6">
                          <button className="btn-ghost h-8 px-3 text-xs text-muted-foreground hover:text-foreground flex items-center justify-end ml-auto">
                            <Download className="h-3.5 w-3.5 mr-1.5" /> PDF
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="h-32 text-center text-muted-foreground bg-background">
                        No invoices found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* UNBILLED SESSIONS TAB */}
        <TabsContent value="unbilled" className="space-y-4">
          <div className="enterprise-table-container flex flex-col border border-warning/30 shadow-sm">
            <div className="p-4 sm:p-5 border-b border-border bg-card">
              <h2 className="text-lg font-bold text-foreground">Ready to Bill</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Completed sessions with signed notes that haven't been invoiced yet.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="enterprise-table-header">
                  <tr>
                    <th className="enterprise-table-head pl-6">Date</th>
                    <th className="enterprise-table-head">Patient</th>
                    <th className="enterprise-table-head">Service Code</th>
                    <th className="enterprise-table-head text-right">Expected Amount</th>
                    <th className="enterprise-table-head text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.unbilledSessions.length > 0 ? (
                    data.unbilledSessions.map((session) => (
                      <tr key={session.id} className="enterprise-table-row group hover:bg-accent/50 transition-colors">
                        <td className="enterprise-table-cell pl-6 text-sm text-muted-foreground">
                          {session.date}
                        </td>
                        <td className="enterprise-table-cell font-bold text-foreground group-hover:text-info transition-colors">
                          {session.patientName}
                        </td>
                        <td className="enterprise-table-cell text-sm text-muted-foreground font-mono">
                          {session.serviceCode}
                        </td>
                        <td className="enterprise-table-cell text-right font-mono font-bold text-foreground">
                          {session.amount}
                        </td>
                        <td className="enterprise-table-cell text-right pr-6">
                          <button className="btn-primary h-8 px-4 text-xs shadow-md">
                            Generate Invoice
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="h-32 text-center text-muted-foreground bg-background">
                        All sessions have been billed!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
