'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUpdateClient } from '@/features/clients/api/update-client';

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientData: any; 
}

export function EditClientModal({ isOpen, onClose, clientData }: EditClientModalProps) {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: ''
  });

  const { mutate: updateClient, isPending } = useUpdateClient();

  useEffect(() => {
    if (clientData && isOpen) {
      setFormData({
        displayName: clientData.name || '',
        email: clientData.email || '',
        phone: clientData.phone || ''
      });
    }
  }, [clientData, isOpen]);

  if (!isOpen || !clientData) return null;

  const handleUpdate = () => {
    if (!formData.displayName.trim()) {
      toast.error('Display Name is required');
      return;
    }

    updateClient(
      {
        id: clientData.id,
        name: formData.displayName, // 🟢 FIX: Send 'name' explicitly to pass backend schema validation
        displayName: formData.displayName,
        email: formData.email,
        phone: formData.phone
      },
      {
        onSuccess: () => {
          toast.success('Record updated successfully!');
          onClose();
        },
        onError: (error: any) => {
          toast.error(error?.response?.data?.message || 'Failed to update record');
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-250">
      <div className="w-full max-w-md bg-card border border-border shadow-2xl rounded-[20px] overflow-hidden">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-info" />
            <h2 className="text-lg font-bold text-foreground">Edit Record</h2>
          </div>
          <button onClick={onClose} disabled={isPending} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 bg-card">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Name to Display <span className="text-destructive">*</span></label>
            <input 
              type="text" 
              value={formData.displayName} 
              onChange={(e) => setFormData({...formData, displayName: e.target.value})} 
              disabled={isPending}
              className="w-full h-[44px] px-3 rounded-[12px] border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Email Address</label>
            <input 
              type="email" 
              value={formData.email} 
              onChange={(e) => setFormData({...formData, email: e.target.value})} 
              disabled={isPending}
              className="w-full h-[44px] px-3 rounded-[12px] border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
            <input 
              type="text" 
              value={formData.phone} 
              onChange={(e) => setFormData({...formData, phone: e.target.value})} 
              disabled={isPending}
              className="w-full h-[44px] px-3 rounded-[12px] border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50" 
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-card flex justify-end gap-3">
          <button onClick={onClose} disabled={isPending} className="px-4 py-2 h-[44px] rounded-[12px] text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            Cancel
          </button>
          <button onClick={handleUpdate} disabled={isPending} className="flex items-center gap-2 px-5 py-2 h-[44px] rounded-[12px] bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all shadow-md disabled:opacity-70">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  );
}
