'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  Download, 
  Mail, 
  Eye, 
  CheckCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

// Shadcn UI Components
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

// API Hooks
import { useInvoices } from '@/features/billing/api/get-invoices'; 
import { useDownloadInvoicePdf } from '@/features/billing/api/use-download-invoice-pdf';
import { useEmailInvoice } from '@/features/billing/api/use-email-invoice';
import { useUpdateInvoiceStatus } from '@/features/billing/api/use-update-invoice-status';
import { useAuthUser } from '@/features/auth/api/get-auth-user';

// Types
interface Invoice {
  id: string;
  invoiceNumber?: string;
  client?: {
    name: string;
    email?: string;
  };
  totalAmount: number | string;
  issueDate: string;
  status: string;
}

// Helpers
const formatCurrency = (amount: number | string) => {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(Number(amount));
};

const getStatusBadge = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'PAID': return <span className="badge-base badge-paid">Paid</span>;
    case 'OVERDUE': return <span className="badge-base badge-overdue">Overdue</span>;
    case 'CANCELLED': return <span className="badge-base badge-cancelled">Cancelled</span>;
    case 'PENDING': case 'SENT': case 'PARTIALLY_PAID': return <span className="badge-base badge-pending">Pending</span>;
    default: return <span className="badge-base badge-draft">{status}</span>;
  }
};

// Route Guard Wrapper
export default function InvoicesListPage() {
  const { data: user, isLoading: isUserLoading } = useAuthUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user) {
      const isAuthorized = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role);
      
      if (!isAuthorized) {
        toast.error('You do not have permission to access invoices.');
        router.push('/dashboard');
      }
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
      </div>
    );
  }

  return <InvoicesPageContent />;
}

// Main Page Content
function InvoicesPageContent() {
  const router = useRouter();
  
  // States for Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Queries & Mutations
  const { data: invoicesResponse, isLoading } = useInvoices({ 
    search: searchQuery, 
    status: statusFilter !== 'ALL' ? statusFilter : undefined 
  });
  
  // Extract invoices array safely
  const invoices = invoicesResponse?.data || invoicesResponse?.invoices || (Array.isArray(invoicesResponse) ? invoicesResponse : []);

  // 🟢 DYNAMIC METRICS CALCULATION (Live from the fetched data)
  const paidInvoices = invoices.filter((i: Invoice) => i.status === 'PAID');
  const collectedAmount = paidInvoices.reduce((sum: number, i: Invoice) => sum + Number(i.totalAmount || 0), 0);

  const pendingInvoices = invoices.filter((i: Invoice) => ['PENDING', 'SENT', 'PARTIALLY_PAID', 'DRAFT'].includes(i.status));
  const pendingAmount = pendingInvoices.reduce((sum: number, i: Invoice) => sum + Number(i.totalAmount || 0), 0);

  const overdueInvoices = invoices.filter((i: Invoice) => i.status === 'OVERDUE');
  const overdueAmount = overdueInvoices.reduce((sum: number, i: Invoice) => sum + Number(i.totalAmount || 0), 0);

  const { mutate: downloadPdf } = useDownloadInvoicePdf();
  const { mutate: emailInvoice } = useEmailInvoice();
  const { mutate: updateStatus } = useUpdateInvoiceStatus();

  // Handlers
  const handleDownloadPdf = (id: string) => {
    const loadingToast = toast.loading('Generating PDF...');
    downloadPdf(id, {
      onSuccess: () => toast.success('PDF downloaded successfully', { id: loadingToast }),
      onError: () => toast.error('Failed to download PDF', { id: loadingToast }),
    });
  };

  const handleEmailInvoice = (id: string) => {
    const loadingToast = toast.loading('Sending email...');
    emailInvoice(id, {
      onSuccess: (data) => toast.success(data?.message || 'Invoice emailed successfully', { id: loadingToast }),
      onError: () => toast.error('Failed to send email', { id: loadingToast }),
    });
  };

  const handleMarkAsPaid = (id: string) => {
    const loadingToast = toast.loading('Updating status...');
    updateStatus({ id, status: 'PAID' }, {
      onSuccess: () => {
        toast.success('Invoice marked as paid', { id: loadingToast });
      },
      onError: () => {
        toast.error('Failed to update status', { id: loadingToast });
      }
    });
  };

  const handleNavigateToCreate = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    router.push('/invoices/create');
  };

  return (
    <div className="timeflow-container space-y-6 animate-in fade-in duration-500 py-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Invoices & Billing
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage and track your client invoices.
          </p>
        </div>
        <button 
          onClick={handleNavigateToCreate}
          onTouchEnd={handleNavigateToCreate}
          className="btn-primary shrink-0 w-full sm:w-auto flex items-center justify-center h-[44px] px-6 touch-manipulation"
        >
          <Plus className="w-4 h-4 mr-2" /> Create Invoice
        </button>
      </div>

      {/* TOP ROW: Invoice Summary Metrics (🟢 NOW DYNAMIC) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="enterprise-card group flex items-start gap-4">
          <div className="p-3 bg-success/20 text-success rounded-xl group-hover:bg-success group-hover:text-white transition-colors">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Total Collected</p>
            <h3 className="text-2xl font-bold text-white mt-1 tracking-tight">{formatCurrency(collectedAmount)}</h3>
            <p className="text-xs text-muted-foreground mt-1.5 font-medium">
              {paidInvoices.length} invoice{paidInvoices.length !== 1 ? 's' : ''} paid
            </p>
          </div>
        </div>

        <div className="enterprise-card group flex items-start gap-4">
          <div className="p-3 bg-info/20 text-info rounded-xl group-hover:bg-info group-hover:text-white transition-colors">
            <Clock className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Pending Payment</p>
            <h3 className="text-2xl font-bold text-white mt-1 tracking-tight">{formatCurrency(pendingAmount)}</h3>
            <p className="text-xs text-muted-foreground mt-1.5 font-medium">
              {pendingInvoices.length} invoice{pendingInvoices.length !== 1 ? 's' : ''} awaiting payment
            </p>
          </div>
        </div>

        <div className="enterprise-card group flex items-start gap-4 relative overflow-hidden">
          <div className="p-3 bg-destructive/20 text-destructive rounded-xl group-hover:bg-destructive group-hover:text-white transition-colors">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Overdue</p>
            <h3 className="text-2xl font-bold text-white mt-1 tracking-tight">{formatCurrency(overdueAmount)}</h3>
            <p className="text-xs text-destructive mt-1.5 font-medium flex items-center gap-1">
              {overdueInvoices.length > 0 
                ? `${overdueInvoices.length} immediate action required` 
                : 'No overdue invoices'}
            </p>
          </div>
        </div>
      </div>

      {/* Filters & Search Card */}
      <div className="enterprise-card p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by client or invoice #..." 
            className="pl-9 h-[44px] bg-[#0F172A] border-border text-white placeholder:text-[#64748B] focus-visible:ring-primary rounded-[10px] transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-[44px] bg-[#0F172A] border-border text-white rounded-[10px] focus:ring-primary transition-all cursor-pointer">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-[#0F172A] border-border text-white rounded-[12px] shadow-xl">
              <SelectItem value="ALL" className="focus:bg-[#172554] focus:text-white cursor-pointer">All Statuses</SelectItem>
              <SelectItem value="PENDING" className="focus:bg-[#172554] focus:text-white cursor-pointer">Pending</SelectItem>
              <SelectItem value="PAID" className="focus:bg-[#172554] focus:text-white cursor-pointer">Paid</SelectItem>
              <SelectItem value="OVERDUE" className="focus:bg-[#172554] focus:text-white cursor-pointer">Overdue</SelectItem>
              <SelectItem value="CANCELLED" className="focus:bg-[#172554] focus:text-white cursor-pointer">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Table */}
      <div className="enterprise-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="enterprise-table-header">
              <tr>
                <th className="enterprise-table-head pl-6">Invoice #</th>
                <th className="enterprise-table-head">Client</th>
                <th className="enterprise-table-head text-right">Amount</th>
                <th className="enterprise-table-head">Issue Date</th>
                <th className="enterprise-table-head">Status</th>
                <th className="enterprise-table-head text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="enterprise-table-row">
                    <td className="enterprise-table-cell pl-6"><Skeleton className="h-4 w-20 bg-muted/20" /></td>
                    <td className="enterprise-table-cell"><Skeleton className="h-4 w-32 bg-muted/20" /></td>
                    <td className="enterprise-table-cell text-right"><Skeleton className="h-4 w-24 ml-auto bg-muted/20" /></td>
                    <td className="enterprise-table-cell"><Skeleton className="h-4 w-24 bg-muted/20" /></td>
                    <td className="enterprise-table-cell"><Skeleton className="h-6 w-20 rounded-full bg-muted/20" /></td>
                    <td className="enterprise-table-cell text-right pr-6"><Skeleton className="h-8 w-8 inline-block rounded-md bg-muted/20" /></td>
                  </tr>
                ))
              ) : invoices && invoices.length > 0 ? (
                invoices.map((invoice: Invoice) => (
                  <tr key={invoice.id} className="enterprise-table-row group">
                    <td className="enterprise-table-cell pl-6 font-medium text-white group-hover:text-info transition-colors">
                      {invoice.invoiceNumber || invoice.id.slice(0, 8)}
                    </td>
                    <td className="enterprise-table-cell">
                      <div className="font-semibold text-white">{invoice.client?.name || 'Unknown Client'}</div>
                      {invoice.client?.email && (
                         <div className="text-xs text-[#CBD5E1] mt-0.5">{invoice.client.email}</div>
                      )}
                    </td>
                    <td className="enterprise-table-cell text-right font-mono font-bold text-white">
                      {formatCurrency(invoice.totalAmount)}
                    </td>
                    <td className="enterprise-table-cell text-[#CBD5E1] font-medium text-sm">
                      {new Date(invoice.issueDate).toLocaleDateString()}
                    </td>
                    <td className="enterprise-table-cell">
                      {getStatusBadge(invoice.status)}
                    </td>
                    <td className="enterprise-table-cell text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="btn-ghost h-8 w-8 p-0 opacity-80 group-hover:opacity-100 hover:text-white rounded-md">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 border-border rounded-[12px] bg-[#0F172A] shadow-xl">
                          <DropdownMenuLabel className="text-muted-foreground">Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => router.push(`/invoices/${invoice.id}`)} className="cursor-pointer focus:bg-[#172554] focus:text-white">
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadPdf(invoice.id)} className="cursor-pointer focus:bg-[#172554] focus:text-white">
                            <Download className="mr-2 h-4 w-4" /> Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEmailInvoice(invoice.id)} className="cursor-pointer focus:bg-[#172554] focus:text-white">
                            <Mail className="mr-2 h-4 w-4" /> Email Client
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-border" />
                          {invoice.status !== 'PAID' && (
                            <DropdownMenuItem 
                              onClick={() => handleMarkAsPaid(invoice.id)}
                              className="text-success focus:text-success focus:bg-success/10 cursor-pointer font-medium transition-colors"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" /> Record Payment
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="h-48 text-center p-0">
                    <div className="flex flex-col items-center justify-center text-muted-foreground py-10">
                      <div className="bg-[#172554] p-4 rounded-full mb-4 shadow-inner">
                         <Search className="h-6 w-6 text-info" />
                      </div>
                      <p className="text-lg font-medium text-white">No invoices found</p>
                      <p className="text-sm mt-1 text-[#CBD5E1]">Try adjusting your search or filters.</p>
                      <button className="btn-secondary mt-5" onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}>
                        Clear Filters
                      </button>
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
