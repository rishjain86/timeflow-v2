'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { 
  Plus, Trash2, Receipt, User, Calendar as CalendarIcon, 
  StickyNote, FileText, ImagePlus, X, ArrowLeft, Loader2, Edit3
} from 'lucide-react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import { useClients } from '@/features/clients/api/get-clients';
import { useInvoice } from '@/features/billing/api/get-invoice';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

interface Client {
  id: string;
  name: string;
  email?: string;
}

const invoiceItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
});

const invoiceSchema = z.object({
  clientId: z.string().uuid('Please select a valid client'),
  issueDate: z.string().min(1, 'Issue date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'At least one item is required'),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params?.id as string;
  const queryClient = useQueryClient();

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const { data: clients, isLoading: isLoadingClients } = useClients();
  const { data: rawData, isLoading: isLoadingInvoice, isError } = useInvoice(invoiceId);
  
  // 🟢 FIX: Smart extraction preventing error object bypass
  const invoice = rawData?.success === false ? null : (rawData?.invoice || rawData?.data?.invoice || rawData?.data || rawData);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      clientId: '',
      issueDate: '',
      dueDate: '',
      notes: '',
      items: [{ description: '', quantity: 1, unitPrice: 0 }],
    },
  });

  const { control, handleSubmit, reset } = form;

  // 🟢 SMART PRE-FILL LOGIC
  useEffect(() => {
    if (invoice && Object.keys(invoice).length > 0) {
      
      // Fallback row matching the details page if backend items array is empty
      const formItems = invoice.items && invoice.items.length > 0 
        ? invoice.items.map((i: any) => ({
            description: i.description || '',
            quantity: Number(i.quantity) || 1,
            unitPrice: Number(i.unitPrice) || 0
          })) 
        : [{ 
            description: 'Custom Service Billing', 
            quantity: 1, 
            unitPrice: Number(invoice.subtotal || invoice.totalAmount || 0) 
          }];

      reset({
        clientId: invoice.clientId || invoice.client?.id || '',
        issueDate: invoice.issueDate ? new Date(invoice.issueDate).toISOString().split('T')[0] : '',
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
        notes: invoice.notes || '',
        items: formItems
      });
    }
  }, [invoice, reset]);

  const { mutate: updateInvoice, isPending: isUpdating } = useMutation({
    mutationFn: async (payload: any) => {
      // 🟢 FIX: Added /billing back to the update route
      const { data } = await axiosInstance.put(`/billing/invoices/${invoiceId}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchedItems = useWatch({
    control,
    name: 'items',
  });

  const calculateTotal = () => {
    return watchedItems?.reduce((total, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      return total + (qty * price);
    }, 0) || 0;
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const onSubmit = (data: InvoiceFormValues) => {
    const loadingToast = toast.loading('Updating invoice...');

    const processAndSend = (logoBase64?: string | ArrayBuffer | null) => {
      const payload: any = {
        ...data,
        issueDate: new Date(data.issueDate).toISOString(),
        dueDate: new Date(data.dueDate).toISOString(),
      };

      if (logoBase64 !== undefined) {
        payload.logo = logoBase64;
      }
      
      updateInvoice(payload, {
        onSuccess: () => {
          toast.success('Invoice updated successfully!', { id: loadingToast });
          setTimeout(() => router.push(`/invoices/${invoiceId}`), 1000);
        },
        onError: (error: any) => {
          toast.error(
            error?.response?.data?.message || 'Failed to update invoice.', 
            { id: loadingToast }
          );
        },
      });
    };

    if (logoFile) {
      const reader = new FileReader();
      reader.onloadend = () => processAndSend(reader.result);
      reader.readAsDataURL(logoFile);
    } else {
      processAndSend(undefined);
    }
  };

  const safeSubmit = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    handleSubmit(onSubmit)();
  };

  if (isLoadingInvoice) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
      </div>
    );
  }

  if (isError || !invoice || Object.keys(invoice).length === 0) {
    return (
      <div className="flex flex-col h-[80vh] items-center justify-center animate-in fade-in">
        <h2 className="text-xl font-bold text-white mb-2">Invoice Not Found</h2>
        <p className="text-muted-foreground mb-6">Unable to load the invoice for editing.</p>
        <button onClick={() => router.push('/invoices')} className="btn-secondary">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Invoices
        </button>
      </div>
    );
  }

  const displayInvoiceNumber = invoice.invoiceNumber || `INV-${invoiceId.slice(0, 8)}`;

  return (
    <div className="timeflow-container space-y-6 animate-in fade-in duration-500 py-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push(`/invoices/${invoiceId}`)} 
            className="h-10 w-10 flex items-center justify-center rounded-full bg-[#0F172A] border border-border text-muted-foreground hover:text-white hover:border-primary/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              Edit Invoice
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Updating details for {displayInvoiceNumber}
            </p>
          </div>
        </div>
        <div className="p-3 bg-primary/20 rounded-[12px] hidden sm:flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(37,99,235,0.15)]">
          <Edit3 className="w-6 h-6 text-info" />
        </div>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          <div className="enterprise-card p-0 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border bg-[#0F172A]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ImagePlus className="w-5 h-5 text-muted-foreground" /> 
                Invoice Branding
              </h2>
            </div>
            <div className="p-5 md:p-6">
              <label className="text-sm font-medium text-white mb-3 block">Company Logo (Optional)</label>
              <div className="flex items-center gap-4">
                <label className="relative flex flex-col items-center justify-center w-28 h-28 rounded-[12px] border-2 border-dashed border-border hover:border-primary/50 bg-[#07111F] cursor-pointer touch-manipulation group overflow-hidden transition-all">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Invoice Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                      <ImagePlus className="w-6 h-6 mb-2" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Change</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </label>
                
                {logoPreview && (
                  <button 
                    type="button" 
                    onClick={removeLogo}
                    className="p-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white rounded-[8px] transition-colors border border-destructive/20 touch-manipulation"
                    title="Remove Logo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Upload a new brand logo if you wish to change the existing one.</p>
            </div>
          </div>

          <div className="enterprise-card p-0 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border bg-[#0F172A]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-muted-foreground" /> 
                Client & Dates
              </h2>
            </div>
            <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-white mb-1.5 block">Client <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined} disabled={isLoadingClients}>
                      <FormControl>
                        <SelectTrigger className="h-[44px] w-full bg-[#0F172A] border-border text-white rounded-[10px] focus:ring-primary transition-all">
                          <SelectValue placeholder={isLoadingClients ? "Loading clients..." : "Select a client"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[#0F172A] border-border text-white rounded-[12px] shadow-xl">
                        {clients?.map((client: Client) => (
                          <SelectItem key={client.id} value={client.id} className="focus:bg-[#172554] focus:text-white cursor-pointer">
                            {client.name} {client.email ? `(${client.email})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-destructive text-xs mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="issueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-white mb-1.5 flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" /> Issue Date <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <input 
                        type="date" 
                        className="w-full h-[44px] rounded-[10px] bg-[#0F172A] px-3 text-white border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm [color-scheme:dark]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-destructive text-xs mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-white mb-1.5 flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" /> Due Date <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <input 
                        type="date" 
                        className="w-full h-[44px] rounded-[10px] bg-[#0F172A] px-3 text-white border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm [color-scheme:dark]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-destructive text-xs mt-1" />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="enterprise-card p-0 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border bg-[#0F172A] flex flex-row items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-muted-foreground" />
                Line Items
              </h2>
              <button
                type="button"
                className="btn-secondary h-9 px-3 text-xs touch-manipulation"
                onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}
                onTouchEnd={(e) => { e.preventDefault(); append({ description: '', quantity: 1, unitPrice: 0 }); }}
              >
                <Plus className="w-4 h-4 mr-2" /> Add Item
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="enterprise-table-header">
                  <tr>
                    <th className="enterprise-table-head pl-6 w-[45%]">Description</th>
                    <th className="enterprise-table-head w-[15%]">Qty</th>
                    <th className="enterprise-table-head w-[20%]">Unit Price</th>
                    <th className="enterprise-table-head w-[15%] text-right">Total</th>
                    <th className="enterprise-table-head w-[5%] pr-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {fields.map((field, index) => {
                    const currentQty = watchedItems?.[index]?.quantity || 0;
                    const currentPrice = watchedItems?.[index]?.unitPrice || 0;
                    const rowTotal = (currentQty * currentPrice).toFixed(2);

                    return (
                      <tr key={field.id} className="enterprise-table-row hover:bg-transparent">
                        <td className="enterprise-table-cell pl-6 align-top pt-5">
                          <FormField
                            control={control}
                            name={`items.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <input 
                                    placeholder="e.g. Service" 
                                    className="w-full h-[40px] rounded-[8px] bg-[#0F172A] px-3 text-white border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm placeholder:text-muted-foreground" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage className="text-destructive text-xs mt-1" />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="enterprise-table-cell align-top pt-5">
                          <FormField
                            control={control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <input 
                                    type="number" 
                                    min="1" 
                                    className="w-full h-[40px] rounded-[8px] bg-[#0F172A] px-3 text-white border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage className="text-destructive text-xs mt-1" />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="enterprise-table-cell align-top pt-5">
                          <FormField
                            control={control}
                            name={`items.${index}.unitPrice`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">$</span>
                                    <input 
                                      type="number" 
                                      step="0.01" 
                                      min="0" 
                                      className="w-full h-[40px] rounded-[8px] bg-[#0F172A] pl-7 pr-3 text-white border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm font-mono" 
                                      {...field} 
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage className="text-destructive text-xs mt-1" />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="enterprise-table-cell text-right font-mono font-medium align-top pt-7 text-white">
                          ${rowTotal}
                        </td>
                        <td className="enterprise-table-cell text-right align-top pt-5 pr-6">
                          {fields.length > 1 && (
                            <button
                              type="button"
                              className="h-10 w-10 flex items-center justify-center rounded-[8px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation"
                              onClick={() => remove(index)}
                              onTouchEnd={(e) => { e.preventDefault(); remove(index); }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-5 sm:p-6 border-t border-border flex justify-end bg-[#07111F]">
              <div className="w-full sm:w-[320px] bg-[#0F172A] border border-border rounded-[12px] p-5 shadow-inner space-y-3">
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground font-medium">Subtotal</span>
                  <span className="font-mono font-bold text-white">${calculateTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground font-medium">Tax</span>
                  <span className="font-mono font-bold text-[#64748B]">$0.00</span>
                </div>
                <div className="border-t border-border pt-3 mt-3 flex justify-between items-center">
                  <span className="text-base font-bold text-white">Total Amount</span>
                  <span className="text-xl font-mono font-bold text-primary">
                    ${calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="enterprise-card p-0 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border bg-[#0F172A]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-muted-foreground" />
                Additional Notes
              </h2>
            </div>
            <div className="p-5 md:p-6">
              <FormField
                control={control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <textarea 
                        placeholder="Add payment terms, thank you message, bank details, or any other notes..."
                        className="w-full min-h-[120px] rounded-[10px] bg-[#0F172A] p-4 text-white border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm resize-y placeholder:text-muted-foreground"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-destructive text-xs mt-1" />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 pb-10">
            <button
              type="button"
              className="btn-secondary h-[44px] px-8 touch-manipulation"
              onClick={() => router.push(`/invoices/${invoiceId}`)}
              disabled={isUpdating}
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={safeSubmit}
              onTouchEnd={safeSubmit}
              className="btn-primary h-[44px] px-8 shadow-[0_4px_14px_rgba(37,99,235,0.35)] disabled:opacity-70 disabled:cursor-not-allowed touch-manipulation" 
              disabled={isUpdating}
            >
              {isUpdating ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </div>
              ) : (
                'Update Invoice'
              )}
            </button>
          </div>
        </form>
      </Form>
    </div>
  );
}
