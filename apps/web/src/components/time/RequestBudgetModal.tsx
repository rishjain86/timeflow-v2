'use client';

import React, { useState } from 'react';
import { X, Loader2, DollarSign, Clock, FileText, Briefcase } from 'lucide-react';
import { axiosInstance } from '@/lib/axios';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  name: string;
}

interface RequestBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  tasks: Task[];
  onSuccess?: () => void;
}

export default function RequestBudgetModal({ isOpen, onClose, projectId, tasks, onSuccess }: RequestBudgetModalProps) {
  const [hours, setHours] = useState('');
  const [taskId, setTaskId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hours || isNaN(Number(hours)) || Number(hours) <= 0) {
      toast.error('Please enter valid hours (e.g. 5.5)');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please provide a reason for extra budget');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Submitting budget request...');

    try {
      // 🟢 FIX: Payload keys aligned securely with the backend controller
      await axiosInstance.post(`/projects/${projectId}/request-budget`, {
        requestedHours: Number(hours),
        taskId: taskId || null, 
        reason: reason.trim()
      });

      toast.success('Budget request submitted to Managers!', { id: toastId });
      
      setHours('');
      setTaskId('');
      setReason('');
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to submit request', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-[20px] w-full max-w-[500px] shadow-2xl flex flex-col relative overflow-hidden">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/50 shrink-0">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-warning" /> Request Extra Budget
          </h2>
          <button 
            onClick={handleClose} 
            onTouchEnd={handleClose}
            disabled={loading}
            className="p-2 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors touch-manipulation"
          >
            <X className="w-5 h-5 pointer-events-none" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          <div className="bg-warning/10 border border-warning/20 p-3 rounded-xl flex gap-3 text-sm text-warning/90">
            <Clock className="w-5 h-5 shrink-0" />
            <p>Your request will be sent to the Managers for approval. Once approved, the hours will be automatically added.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" /> Select Task
            </label>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              disabled={loading}
              className="input-field py-3 w-full bg-background border border-border text-foreground rounded-xl px-3 outline-none"
              required
            >
              <option value="" disabled className="bg-card">-- Choose a task --</option>
              {tasks && tasks.map((task) => (
                <option key={task.id} value={task.id} className="bg-card">
                  {task.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Additional Hours Needed *
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              disabled={loading}
              placeholder="e.g. 1.0"
              className="input-field py-3 w-full bg-background border border-border text-foreground rounded-xl px-3 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Reason for Extra Budget *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              placeholder="Why do you need extra hours for this task?"
              className="input-field min-h-[100px] resize-none py-3 w-full bg-background border border-border text-foreground rounded-xl px-3 outline-none"
            />
          </div>

          <div className="pt-4 flex flex-col md:flex-row justify-end gap-3">
            <button 
              type="button" 
              onClick={handleClose}
              onTouchEnd={handleClose}
              disabled={loading} 
              className="px-4 py-3 md:py-2 min-h-[44px] rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors touch-manipulation w-full md:w-auto"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="btn-primary bg-blue-600 hover:bg-blue-700 text-white py-3 px-5 md:py-2 min-h-[44px] shadow-md disabled:opacity-50 touch-manipulation flex items-center justify-center w-full md:w-auto rounded-xl"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Request'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
