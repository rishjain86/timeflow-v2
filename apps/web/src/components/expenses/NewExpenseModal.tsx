'use client';

import React, { useState, useEffect } from 'react';
import { X, Receipt, Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import toast from 'react-hot-toast';
import { axiosInstance } from '@/lib/axios';
import { useOrganization } from '@/features/organizations/api/get-organization';

interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewExpenseModal({ isOpen, onClose }: NewExpenseModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isPending, setIsPending] = useState(false);

  const [projects, setProjects] = useState<any[]>([]);
  const { data: currentOrganization } = useOrganization();
  const isHealthcare = currentOrganization?.industryType === 'HEALTHCARE';

  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const solidBg = isDark ? '#1E293B' : '#F8FAFC';
  const solidText = isDark ? '#ffffff' : '#0F172A';

  useEffect(() => {
    if (isOpen) {
      axiosInstance.get('/projects')
        .then(res => {
          const pData = res.data?.data?.projects || res.data?.projects || res.data?.data || res.data || [];
          setProjects(Array.isArray(pData) ? pData : []);
        })
        .catch(err => console.error('Failed to fetch projects for expense', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!title.trim() || !amount || Number(amount) <= 0) {
      toast.error('Title and valid Amount are required!');
      return;
    }

    try {
      setIsPending(true);
      await axiosInstance.post('/expenses', {
        title,
        description,
        amount: Number(amount),
        projectId: projectId || undefined,
        date: new Date(date).toISOString(),
      });
      toast.success('Expense added successfully!');
      setTitle('');
      setDescription('');
      setAmount('');
      setProjectId('');
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create expense');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 animate-in fade-in duration-250 p-4">
      <div className={`w-full max-w-md border border-border shadow-2xl rounded-[20px] overflow-hidden flex flex-col ${isDark ? 'bg-[#0F172A]' : 'bg-white'}`}>
        
        <div className={`flex items-center justify-between px-6 py-4 border-b border-border shrink-0 ${isDark ? 'bg-[#1E293B]' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Add New Expense</h2>
          </div>
          <button 
            onClick={onClose} 
            disabled={isPending} 
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`p-6 space-y-4 overflow-y-auto ${isDark ? 'bg-[#0F172A]' : 'bg-white'}`}>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Expense Title <span className="text-destructive">*</span></label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isPending}
              className="w-full h-[44px] px-3 rounded-[12px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
              style={{ backgroundColor: solidBg, color: solidText }}
              placeholder="e.g. Software Subscription / Travel"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Amount ($) <span className="text-destructive">*</span></label>
              <input 
                type="number" 
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isPending}
                className="w-full h-[44px] px-3 rounded-[12px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
                style={{ backgroundColor: solidBg, color: solidText }}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Date</label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isPending}
                className="w-full h-[44px] px-3 rounded-[12px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
                style={{ backgroundColor: solidBg, color: solidText }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Link to {isHealthcare ? 'Case / Project' : 'Project'}</label>
            <select 
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={isPending}
              className="w-full h-[44px] px-3 rounded-[12px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: solidBg, color: solidText }}
            >
              <option value="" style={{ backgroundColor: solidBg, color: solidText }}>-- General / No Project --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id} style={{ backgroundColor: solidBg, color: solidText }}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Description / Notes</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
              className="w-full p-3 rounded-[12px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50 resize-none min-h-[80px]"
              style={{ backgroundColor: solidBg, color: solidText }}
              placeholder="Add details about the expense..."
            />
          </div>

        </div>

        <div className={`px-6 py-4 border-t border-border flex justify-end gap-3 shrink-0 ${isDark ? 'bg-[#1E293B]' : 'bg-slate-50'}`}>
          <button 
            onClick={onClose} 
            disabled={isPending} 
            className="px-4 py-2 h-[44px] rounded-[12px] text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={isPending} 
            className={`flex items-center gap-2 px-5 py-2 h-[44px] rounded-[12px] bg-primary hover:bg-primary/90 text-sm font-semibold transition-all shadow-md disabled:opacity-70 ${isDark ? 'text-white' : 'text-white font-bold'}`}
          >
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Expense'}
          </button>
        </div>

      </div>
    </div>
  );
}
