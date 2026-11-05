'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Download, 
  Send, 
  Printer, 
  Edit, 
  CheckCircle,
  MoreVertical,
  Building2,
  Mail,
  MapPin,
  Loader2,
  FileText,
  Trash2,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

import { useInvoice } from '@/features/billing/api/get-invoice';
import { useDownloadInvoicePdf } from '@/features/billing/api/use-download-invoice-pdf';
import { useEmailInvoice } from '@/features/billing/api/use-email-invoice';
import { useUpdateInvoiceStatus } from '@/features/billing/api/use-update-invoice-status';

const formatCurrency = (amount: number | string | undefined) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount || 0));
};

const getInvoiceBadge = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'PAID':
      return <span className="badge-base badge-paid text-sm px-3 py-1">Paid</span>;
    case 'PENDING':
    case 'SENT':
    case 'PARTIALLY_PAID':
      return <span className="badge-base badge-info text-sm px-3 py-1">Pending</span>;
    case 'OVERDUE':
      return <span className="badge-base badge-overdue text-sm px-3 py-1">Overdue</span>;
    case 'CANCELLED':
      return <span className="badge-base badge-cancelled text-sm px-3 py-1 bg-muted/20 text-muted-foreground border-border">Cancelled</span>;
    default:
      return <span className="badge-base badge-draft text-sm px-3 py-1">{status || 'Draft'}</span>;
  }
};

export default function InvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const invoiceId = params?.id as string;

  const { data: rawData, isLoading, isError } = useInvoice(invoiceId);
  
  // 🟢 FIX: Smart extraction preventing error object bypass
  const invoice = rawData?.success === false ? null : (rawData?.invoice || rawData?.data?.invoice || rawData?.data || rawData);

  const { mutate: downloadPdf } = useDownloadInvoicePdf();
  const { mutate: emailInvoice } = useEmailInvoice();
  const { mutate: updateStatus } = useUpdateInvoiceStatus();

  const handlePrint = () => window.print();

  const handleDownload = () => {
    const loadingToast = toast.loading('Generating PDF...');
    downloadPdf(invoiceId, {
      onSuccess: () => toast.success('PDF downloaded successfully', { id: loadingToast }),
      onError: () => toast.error('Failed to download PDF', { id: loadingToast }),
    });
  };

  const handleSendEmail = () => {
    const loadingToast = toast.loading('Sending email...');
    emailInvoice(invoiceId, {
      onSuccess: (data) => toast.success(data?.message || 'Invoice sent to client successfully!', { id: loadingToast }),
      onError: () => toast.error('Failed to send email', { id: loadingToast }),
    });
  };

  const handleMarkAsPaid = () => {
    const loadingToast = toast.loading('Updating status to Paid...');
    updateStatus({ id: invoiceId, status: 'PAID' }, {
      onSuccess: () => toast.success('Invoice marked as Paid!', { id: loadingToast }),
      onError: () => toast.error('Failed to update status', { id: loadingToast })
    });
  };

  const handleCancelInvoice = () => {
    if (!window.confirm('Are you sure you want to cancel this invoice? It will be marked as void.')) return;
    const loadingToast = toast.loading('Cancelling invoice...');
    updateStatus({ id: invoiceId, status: 'CANCELLED' }, {
      onSuccess: () => toast.success('Invoice has been cancelled/voided.', { id: loadingToast }),
      onError: () => toast.error('Failed to cancel invoice', { id: loadingToast })
    });
  };

  const handleDeleteInvoice = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this draft invoice? This action cannot be undone.')) return;
    const loadingToast = toast.loading('Deleting invoice...');
    try {
      // 🟢 FIX: Added /billing back to the delete route
      await axiosInstance.delete(`/billing/invoices/${invoiceId}`);
      toast.success('Invoice deleted successfully.', { id: loadingToast });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['billing-metrics'] });
      router.push('/invoices'); 
    } catch (error) {
      toast.error('Failed to delete invoice.', { id: loadingToast });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
      </div>
    );
  }

  // Double check if invoice actually exists after extraction
  if (isError || !invoice || Object.keys(invoice).length === 0) {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center animate-in fade-in">
        <FileText className="w-12 h-12 text-muted-foreground opacity-30 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Invoice Not Found</h2>
        <p className="text-muted-foreground mb-6">The invoice you are looking for does not exist or was deleted.</p>
        <button onClick={() => router.push('/invoices')} className="btn-secondary">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Invoices
        </button>
      </div>
    );
  }

  const subtotal = invoice.subtotal || invoice.totalAmount || 0;
  const taxRate = invoice.taxRate || 0;
  const taxAmount = invoice.taxAmount || 0;
  const totalAmount = invoice.totalAmount || 0;

  const currentStatus = invoice.status?.toUpperCase() || 'DRAFT';
  const isPaid = currentStatus === 'PAID';
  const isCancelled = currentStatus === 'CANCELLED';
  const isDraft = currentStatus === 'DRAFT';

  const canEdit = !isPaid && !isCancelled;
  const canDelete = isDraft; 
  const canCancel = !isDraft && !isPaid && !isCancelled; 
  const canMarkAsPaid = !isPaid && !isCancelled;

  const displayInvoiceNumber = invoice.invoiceNumber || `INV-${invoiceId.slice(0, 8)}`;
  const displayIssueDate = invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : 'N/A';
  const displayDueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A';

  return (
    <div className="timeflow-container py-6 space-y-6 animate-in fade-in duration-500">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/invoices')} 
            className="h-10 w-10 flex items-center justify-center rounded-full bg-[#0F172A] border border-border text-muted-foreground hover:text-white hover:border-primary/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {displayInvoiceNumber}
              </h1>
              {getInvoiceBadge(currentStatus)}
            </div>
            <p className="text-sm text-[#CBD5E1] mt-0.5 font-medium">
              Issued on {displayIssueDate}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 custom-scrollbar">
          <button className="btn-secondary h-10 px-4 hidden sm:flex shrink-0" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </button>
          <button className="btn-secondary h-10 px-4 shrink-0" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" /> PDF
          </button>
          <button className="btn-primary h-10 px-6 shadow-[0_4px_14px_rgba(37,99,235,0.35)] shrink-0" onClick={handleSendEmail}>
            <Send className="w-4 h-4 mr-2" /> Send
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-10 w-10 flex items-center justify-center rounded-[10px] bg-[#0F172A] border border-border text-muted-foreground hover:text-white transition-colors shrink-0">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 border-border rounded-[12px] bg-[#0F172A] shadow-xl text-white">
              
              {canEdit && (
                <DropdownMenuItem className="cursor-pointer focus:bg-[#172554] focus:text-white" onClick={() => router.push(`/invoices/${invoiceId}/edit`)}>
                  <Edit className="w-4 h-4 mr-2" /> Edit Invoice
                </DropdownMenuItem>
              )}
              
              {canMarkAsPaid && (
                <DropdownMenuItem className="text-success focus:text-success focus:bg-success/10 cursor-pointer font-medium transition-colors mt-1" onClick={handleMarkAsPaid}>
                  <CheckCircle className="w-4 h-4 mr-2" /> Mark as Paid
                </DropdownMenuItem>
              )}

              {canCancel && (
                <DropdownMenuItem className="text-[#F59E0B] focus:text-[#F59E0B] focus:bg-[#F59E0B]/10 cursor-pointer font-medium transition-colors mt-1" onClick={handleCancelInvoice}>
                  <XCircle className="w-4 h-4 mr-2" /> Cancel Invoice
                </DropdownMenuItem>
              )}

              {canDelete && (
                <>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer font-medium transition-colors" onClick={handleDeleteInvoice}>
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Draft
                  </DropdownMenuItem>
                </>
              )}

            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="enterprise-card p-6 sm:p-10 lg:p-12 print:shadow-none print:border-none print:bg-transparent print:p-0">
        
        <div className="flex flex-col md:flex-row justify-between items-start border-b border-border pb-8 gap-8 print:pb-4">
          <div className="space-y-4">
            <div className="h-14 w-14 bg-primary/20 rounded-[12px] flex items-center justify-center border border-primary/30">
              <Building2 className="w-7 h-7 text-info" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">TimeFlow ERP Solutions</h2>
              <div className="text-sm text-[#CBD5E1] mt-2 space-y-1 font-medium">
                <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-muted-foreground" /> 123 Business Avenue, Innovation City</p>
                <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-muted-foreground" /> billing@timeflowerp.com</p>
              </div>
            </div>
          </div>
          <div className="md:text-right space-y-2 w-full md:w-auto border-t border-border pt-6 md:border-none md:pt-0">
            <h2 className="text-2xl sm:text-3xl font-light text-muted-foreground uppercase tracking-widest print:text-black">Invoice</h2>
            <p className="text-lg font-bold text-white print:text-black">{displayInvoiceNumber}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm mt-4 md:justify-end">
              <span className="text-muted-foreground text-left md:text-right font-medium">Issue Date:</span>
              <span className="font-bold text-white text-right print:text-black">{displayIssueDate}</span>
              <span className="text-muted-foreground text-left md:text-right font-medium">Due Date:</span>
              <span className="font-bold text-white text-right print:text-black">{displayDueDate}</span>
            </div>
          </div>
        </div>

        <div className="py-8 print:py-6">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">Bill To</p>
          <h3 className="text-lg font-bold text-white print:text-black">{invoice.client?.name || 'Unknown Client'}</h3>
          {invoice.client?.address && (
            <p className="text-sm text-[#CBD5E1] mt-1.5 max-w-xs leading-relaxed font-medium print:text-gray-700">
              {invoice.client.address}
            </p>
          )}
          {invoice.client?.email && (
            <p className="text-sm font-semibold text-info mt-2 print:text-blue-600">
              {invoice.client.email}
            </p>
          )}
        </div>

        <div className="enterprise-table-container mt-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm min-w-[600px]">
              <thead className="enterprise-table-header">
                <tr>
                  <th className="enterprise-table-head pl-6 py-4">Description</th>
                  <th className="enterprise-table-head py-4 text-center">Qty</th>
                  <th className="enterprise-table-head py-4 text-right">Unit Price</th>
                  <th className="enterprise-table-head pr-6 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((item: any) => (
                    <tr key={item.id} className="enterprise-table-row group hover:bg-[#172554]/30 transition-colors print:hover:bg-transparent">
                      <td className="enterprise-table-cell pl-6 py-4 text-white font-semibold print:text-black">{item.description}</td>
                      <td className="enterprise-table-cell py-4 text-center text-[#CBD5E1] font-medium print:text-gray-700">{item.quantity}</td>
                      <td className="enterprise-table-cell py-4 text-right text-[#CBD5E1] font-mono print:text-gray-700">{formatCurrency(item.unitPrice)}</td>
                      <td className="enterprise-table-cell pr-6 py-4 text-right font-bold text-white font-mono print:text-black">
                        {formatCurrency(Number(item.quantity) * Number(item.unitPrice))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="enterprise-table-row group hover:bg-[#172554]/30 transition-colors print:hover:bg-transparent">
                    <td className="enterprise-table-cell pl-6 py-4 text-white font-semibold print:text-black">Custom Service Billing</td>
                    <td className="enterprise-table-cell py-4 text-center text-[#CBD5E1] font-medium print:text-gray-700">1</td>
                    <td className="enterprise-table-cell py-4 text-right text-[#CBD5E1] font-mono print:text-gray-700">{formatCurrency(subtotal)}</td>
                    <td className="enterprise-table-cell pr-6 py-4 text-right font-bold text-white font-mono print:text-black">
                      {formatCurrency(subtotal)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-start mt-8 pt-8 border-t border-border gap-8 print:mt-4 print:pt-4">
          
          <div className="w-full lg:w-1/2 order-2 lg:order-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Notes & Terms</p>
            <div className="bg-[#07111F] p-4 sm:p-5 rounded-[12px] border border-border shadow-inner print:bg-transparent print:border-none print:p-0">
              <p className="text-sm text-[#CBD5E1] leading-relaxed font-medium print:text-gray-600">
                {invoice.notes || "Thank you for your business. Please process payment by the due date."}
              </p>
            </div>
          </div>

          <div className="w-full lg:w-[340px] bg-[#07111F] p-5 sm:p-6 rounded-[16px] border border-border shadow-inner order-1 lg:order-2 space-y-4 print:bg-transparent print:p-0 print:border-none print:shadow-none">
            <div className="flex justify-between text-sm items-center">
              <span className="text-muted-foreground font-medium">Subtotal</span>
              <span className="font-mono font-bold text-white print:text-black">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-muted-foreground font-medium">Tax ({taxRate}%)</span>
              <span className="font-mono font-bold text-white print:text-black">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="border-t border-border pt-4 mt-2 flex justify-between items-center">
              <span className="text-base font-bold text-white print:text-black">Total Due</span>
              <span className="text-2xl sm:text-3xl font-bold font-mono text-primary print:text-black">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
