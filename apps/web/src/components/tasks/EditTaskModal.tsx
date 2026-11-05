'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { axiosInstance } from '@/lib/axios';
import { useTheme } from 'next-themes';
import toast from 'react-hot-toast';

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: any | null;
}

export const EditTaskModal = ({ isOpen, onClose, task }: EditTaskModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isBillable, setIsBillable] = useState(true);
  const [requiresClinicalCompliance, setRequiresClinicalCompliance] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🟢 Theme support for button text contrast
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  useEffect(() => {
    if (task && isOpen) {
      setName(task.name || '');
      setDescription(task.description || '');
      setIsBillable(task.isBillable ?? true);
      setRequiresClinicalCompliance(task.requiresClinicalCompliance ?? false);
    }
  }, [task, isOpen]);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return toast.error("Task name is required");

    setIsSubmitting(true);
    try {
      await axiosInstance.put(`/tasks/${task.id}`, {
        name,
        description,
        isBillable,
        requiresClinicalCompliance,
      });
      toast.success('Task updated successfully!');
      window.location.reload(); 
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-[20px] w-full max-w-[500px] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/50 rounded-t-[20px]">
          <h2 className="text-lg font-bold text-foreground">Edit Task</h2>
          <button onClick={onClose} disabled={isSubmitting} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Task Name <span className="text-destructive">*</span></label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="w-full h-[44px] px-3 rounded-[12px] border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              className="w-full p-3 rounded-[12px] border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none min-h-[80px]"
            />
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isBillable} onChange={(e) => setIsBillable(e.target.checked)} className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary" />
              <span className="text-sm text-foreground">Billable Task</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={requiresClinicalCompliance} onChange={(e) => setRequiresClinicalCompliance(e.target.checked)} className="w-4 h-4 rounded border-border bg-background text-info focus:ring-info" />
              <span className="text-sm text-info">Clinical Compliance</span>
            </label>
          </div>
          
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-xs text-primary leading-relaxed">
            💡 <b>Task Rate Management:</b> Task rates are dynamically managed inside the <b>Smart Budget Matrix</b>.
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 h-[44px] rounded-[12px] text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className={`flex items-center gap-2 px-5 py-2 h-[44px] rounded-[12px] bg-primary hover:bg-primary/95 text-sm font-semibold transition-all shadow-md ${isDark ? 'text-white' : 'text-slate-900 font-bold'}`}
            >
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
