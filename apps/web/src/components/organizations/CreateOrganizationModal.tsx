'use client';

import React, { useState, useEffect } from 'react';
import { useCreateOrganization } from '@/features/organizations/api/create-organization';
import { X } from 'lucide-react';
import { useTheme } from 'next-themes';

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateOrganizationModal({ isOpen, onClose }: CreateOrganizationModalProps) {
  const { mutateAsync, isPending } = useCreateOrganization();
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    defaultCurrency: 'USD',
  });

  // 🟢 Strict theme logic to fix transparent background and text color clash
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mutateAsync(formData);
      onClose();
    } catch (error) {
      console.error('Failed to create organization', error);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* 🟢 Applied explicit background color based on theme */}
      <div className={`border border-border rounded-xl shadow-2xl w-full max-w-md relative animate-in zoom-in-95 duration-200 ${isDark ? 'bg-[#0F172A]' : 'bg-white'}`}>
        
        <div className={`flex items-center justify-between p-5 border-b border-border ${isDark ? 'bg-[#0F172A]' : 'bg-white'} rounded-t-xl`}>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Create Organization</h2>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={`p-5 space-y-4 ${isDark ? 'bg-[#0F172A]' : 'bg-white'} rounded-b-xl`}>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Organization Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Acme Corp"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              style={{ backgroundColor: isDark ? '#1E293B' : '#F8FAFC', color: isDark ? '#ffffff' : '#0F172A' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Legal Company Name (Optional)</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="e.g. Acme Corporation LLC"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              style={{ backgroundColor: isDark ? '#1E293B' : '#F8FAFC', color: isDark ? '#ffffff' : '#0F172A' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Default Currency</label>
            <input
              type="text"
              maxLength={3}
              value={formData.defaultCurrency}
              onChange={(e) => setFormData({ ...formData, defaultCurrency: e.target.value.toUpperCase() })}
              placeholder="USD"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary uppercase transition-all"
              style={{ backgroundColor: isDark ? '#1E293B' : '#F8FAFC', color: isDark ? '#ffffff' : '#0F172A' }}
            />
          </div>

          <div className={`flex justify-end gap-3 pt-4 border-t mt-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={`px-4 py-2 bg-primary hover:bg-primary/90 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 transition-colors ${isDark ? 'text-white' : 'text-slate-900 font-bold'}`}
            >
              {isPending ? 'Creating...' : 'Create Organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
