'use client';

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Loader2, ShieldCheck } from 'lucide-react';
import { useCreateClient } from '@/features/clients/api/create-client';
import { useTheme } from 'next-themes';
import { useOrganization } from '@/features/organizations/api/get-organization'; // 🟢 Fetched for feature toggling

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewClientModal({ isOpen, onClose }: NewClientModalProps) {
  const { data: currentOrganization } = useOrganization(); // 🟢 Get current org context
  const isHealthcare = currentOrganization?.industryType === 'HEALTHCARE'; // 🟢 Feature Toggle Flag

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    displayName: '',
    email: '',
    phone: '',
    role: isHealthcare ? 'THERAPIST' : 'EMPLOYEE' // 🟢 Dynamic default role based on industry
  });

  // 🟢 Update default role if organization data loads or changes
  useEffect(() => {
    if (currentOrganization) {
      setFormData(prev => ({
        ...prev,
        role: isHealthcare ? 'THERAPIST' : 'EMPLOYEE'
      }));
    }
  }, [currentOrganization, isHealthcare]);

  const { mutate: createClient, isPending } = useCreateClient();

  // 🟢 Enforce strict color definitions to solve the white text on white background issue
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  if (!isOpen) return null;

  const handleCreateClient = () => {
    if (!formData.firstName.trim() || !formData.displayName.trim() || !formData.email.trim()) {
      alert('First Name, Display Name, and Email are required!');
      return;
    }

    createClient(
      formData,
      {
        onSuccess: (created: any) => {
          if (created?.temporaryPassword) {
            alert(
              `Account created for ${formData.email}.\n\nOne-time temporary password:\n${created.temporaryPassword}\n\nCopy it now and share it securely. It will not be shown again.`
            );
          }
          setFormData({ firstName: '', lastName: '', displayName: '', email: '', phone: '', role: isHealthcare ? 'THERAPIST' : 'EMPLOYEE' });
          onClose();
        },
        onError: (err: any) => {
          alert('Error: ' + (err?.response?.data?.message || err.message));
        }
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 animate-in fade-in duration-250 p-4">
      <div className={`w-full max-w-[500px] border border-border shadow-2xl rounded-[20px] overflow-hidden flex flex-col max-h-[90vh] ${isDark ? 'bg-[#0F172A]' : 'bg-white'}`}>
        
        <div className={`flex items-center justify-between px-6 py-4 border-b border-border shrink-0 ${isDark ? 'bg-[#1E293B]' : 'bg-slate-50'}`}>
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Add New {isHealthcare ? 'Case Owner / Payor' : 'Client / Company Contact'}
            </h2>
          </div>
          <button 
            onClick={onClose} 
            disabled={isPending} 
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`p-6 space-y-4 overflow-y-auto custom-scrollbar ${isDark ? 'bg-[#0F172A]' : 'bg-white'}`}>
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-primary leading-relaxed">
              Adding a {isHealthcare ? 'Case Owner' : 'Client'} here will automatically create their team login account with a <strong>one-time temporary password</strong> that is shown once after creation.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">First Name <span className="text-destructive">*</span></label>
              <input 
                type="text" 
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                disabled={isPending}
                className="w-full h-[44px] px-3 rounded-[12px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
                style={{ backgroundColor: isDark ? '#1E293B' : '#F8FAFC', color: isDark ? '#ffffff' : '#0F172A' }}
                placeholder="John"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Last Name</label>
              <input 
                type="text" 
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                disabled={isPending}
                className="w-full h-[44px] px-3 rounded-[12px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
                style={{ backgroundColor: isDark ? '#1E293B' : '#F8FAFC', color: isDark ? '#ffffff' : '#0F172A' }}
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Name to Display <span className="text-destructive">*</span></label>
            <input 
              type="text" 
              value={formData.displayName}
              onChange={(e) => setFormData({...formData, displayName: e.target.value})}
              disabled={isPending}
              className="w-full h-[44px] px-3 rounded-[12px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
              style={{ backgroundColor: isDark ? '#1E293B' : '#F8FAFC', color: isDark ? '#ffffff' : '#0F172A' }}
              placeholder={isHealthcare ? "e.g. John D. (Therapist)" : "e.g. Acme Corp"}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Email Address <span className="text-destructive">*</span></label>
            <input 
              type="email" 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              disabled={isPending}
              className="w-full h-[44px] px-3 rounded-[12px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
              style={{ backgroundColor: isDark ? '#1E293B' : '#F8FAFC', color: isDark ? '#ffffff' : '#0F172A' }}
              placeholder="email@company.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
            <input 
              type="tel" 
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              disabled={isPending}
              className="w-full h-[44px] px-3 rounded-[12px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
              style={{ backgroundColor: isDark ? '#1E293B' : '#F8FAFC', color: isDark ? '#ffffff' : '#0F172A' }}
              placeholder="+1234567890"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Assign System Role <span className="text-destructive">*</span></label>
            {/* 🟢 DYNAMIC ROLE OPTIONS BASED ON INDUSTRY TYPE */}
            <select 
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              disabled={isPending}
              className="w-full h-[44px] px-3 rounded-[12px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: isDark ? '#1E293B' : '#F8FAFC', color: isDark ? '#ffffff' : '#0F172A' }}
            >
              {isHealthcare ? (
                <>
                  <option value="THERAPIST">Therapist / Consultant</option>
                  <option value="EMPLOYEE">Employee</option>
                </>
              ) : (
                <>
                  <option value="EMPLOYEE">Employee / Staff Member</option>
                  <option value="MANAGER">Project Manager</option>
                  <option value="ADMIN">Admin</option>
                </>
              )}
            </select>
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
            onClick={handleCreateClient} 
            disabled={isPending} 
            className={`flex items-center gap-2 px-5 py-2 h-[44px] rounded-[12px] bg-primary hover:bg-primary/90 text-sm font-semibold transition-all shadow-md disabled:opacity-70 ${isDark ? 'text-white' : 'text-white disabled:text-slate-900 font-bold'}`}
          >
            {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Save & Create Account'}
          </button>
        </div>

      </div>
    </div>
  );
}
