'use client';

import React from 'react';
import { 
  CreditCard, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  DollarSign
} from 'lucide-react';

// Shadcn UI Components
import { Skeleton } from '@/components/ui/skeleton';

// API Hook
import { useGetPatientBilling } from '@/features/patient/api/get-patient-billing';

// Helper to determine badge style based on status
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'PAID':
      return <span className="badge-base badge-paid"><CheckCircle2 className="w-3 h-3 mr-1" /> Paid</span>;
    case 'OVERDUE':
      return <span className="badge-base badge-overdue"><AlertCircle className="w-3 h-3 mr-1" /> Overdue</span>;
    case 'PENDING':
    default:
      return <span className="badge-base badge-pending">Pending</span>;
  }
};

export default function PatientBillingPage() {
  const { data, isLoading, isError } = useGetPatientBilling();

  if (isLoading) {
    return (
      <div className="timeflow-container py-6 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48 bg-muted/20" />
            <Skeleton className="h-4 w-72 mt-2 bg-muted/20" />
          </div>
          <Skeleton className="h-10 w-32 rounded-[10px] bg-muted/20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <Skeleton className="h-32 w-full rounded-[16px] bg-muted/20" />
          <Skeleton className="h-32 w-full rounded-[16px] bg-muted/20" />
        </div>
        <Skeleton className="h-[400px] w-full rounded-[16px] bg-muted/20" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="timeflow-container py-20 text-center text-muted-foreground">
        <p className="text-foreground text-lg font-medium">Failed to load billing information.</p>
        <p className="mt-1">Please try refreshing.</p>
      </div>
    );
  }

  return (
    <div className="timeflow-container space-y-6 animate-in fade-in duration-500 py-6">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Billing & Invoices</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage your payments, view invoices, and download receipts.
          </p>
        </div>
        {data.summary.totalOutstanding > 0 && (
          <button className="btn-primary shrink-0 w-full sm:w-auto shadow-md">
            <CreditCard className="mr-2 h-4 w-4" /> Pay Balance (${data.summary.totalOutstanding.toFixed(2)})
          </button>
        )}
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="enterprise-card flex flex-col justify-between group bg-primary/10 border-primary/20 hover:border-primary/50 transition-colors">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-primary">Total Outstanding</span>
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-primary/20">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-bold text-foreground">${data.summary.totalOutstanding.toFixed(2)}</div>
            <p className="text-xs text-primary/80 mt-1">Includes pending and overdue invoices</p>
          </div>
        </div>
        
        <div className="enterprise-card flex flex-col justify-between group">
          <div className="flex items-start justify-between">
            <span className="text-sm font-medium text-muted-foreground">Next Payment Due</span>
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-card border border-border">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {data.summary.nextPaymentDueDate || 'No pending payments'}
            </div>
            {data.summary.nextPaymentDueDate && (
              <p className="text-xs text-destructive mt-1 font-medium">Action required</p>
            )}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="enterprise-table-container flex flex-col">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-card">
          <div>
            <h2 className="text-lg font-bold text-foreground">Invoice History</h2>
            <p className="text-sm text-muted-foreground mt-0.5">A complete list of all your billing activities.</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="enterprise-table-header">
              <tr>
                <th className="enterprise-table-head pl-6">Invoice Details</th>
                <th className="enterprise-table-head">Due Date</th>
                <th className="enterprise-table-head text-right">Amount</th>
                <th className="enterprise-table-head">Status</th>
                <th className="enterprise-table-head text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.length > 0 ? (
                data.invoices.map((invoice) => (
                  <tr key={invoice.id} className="enterprise-table-row group hover:bg-accent/50 transition-colors">
                    <td className="enterprise-table-cell pl-6">
                      <div className="font-semibold text-foreground group-hover:text-info transition-colors">{invoice.description}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Date: {invoice.date}</div>
                    </td>
                    <td className="enterprise-table-cell text-muted-foreground text-sm font-medium">
                      {invoice.dueDate}
                    </td>
                    <td className="enterprise-table-cell text-right font-mono font-bold text-foreground">
                      ${invoice.amount.toFixed(2)}
                    </td>
                    <td className="enterprise-table-cell">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="enterprise-table-cell text-right pr-6">
                      <div className="flex justify-end gap-2">
                        {invoice.status !== 'PAID' ? (
                          <button className="btn-primary h-8 px-4 text-xs shadow-md">
                            Pay Now
                          </button>
                        ) : (
                          <button className="btn-secondary h-8 px-3 text-xs text-muted-foreground hover:text-foreground">
                            <Download className="h-3 w-3 mr-1.5" /> Receipt
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="h-32 text-center text-muted-foreground bg-background">
                    No billing records found.
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
