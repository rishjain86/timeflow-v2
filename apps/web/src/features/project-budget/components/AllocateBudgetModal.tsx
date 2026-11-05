'use client';

import React, { useState } from 'react';
import { X, UserPlus, Clock, Loader2, Briefcase } from 'lucide-react';
import { useAllocateMemberBudget } from '@/features/project-budget/api/allocate-member-budget';

interface AllocateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectBudgetId: string;
  projectId: string;
  availableMembers?: { id: string; firstName: string; lastName: string; email: string }[];
  availableTasks?: { id: string; name: string }[];
}

export function AllocateBudgetModal({
  isOpen,
  onClose,
  projectBudgetId,
  projectId,
  availableMembers = [],
  availableTasks = [],
}: AllocateBudgetModalProps) {
  const [userId, setUserId] = useState('');
  const [allocatedHours, setAllocatedHours] = useState('');
  const [taskAllocations, setTaskAllocations] = useState<{ [taskId: string]: { hours: string; sessionLimit: string } }>({});

  const allocateMutation = useAllocateMemberBudget();

  if (!isOpen) return null;

  const handleTaskHoursChange = (taskId: string, hours: string) => {
    setTaskAllocations(prev => ({
      ...prev,
      [taskId]: { ...prev[taskId], hours }
    }));
  };

  const handleSessionLimitChange = (taskId: string, sessionLimit: string) => {
    setTaskAllocations(prev => ({
      ...prev,
      [taskId]: { ...prev[taskId], sessionLimit }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !allocatedHours) return;

    const formattedTaskAllocations = Object.entries(taskAllocations)
      .filter(([_, data]) => data.hours && Number(data.hours) > 0)
      .map(([taskId, data]) => ({
        taskId,
        allocatedHours: Number(data.hours),
        sessionLimitHours: data.sessionLimit ? Number(data.sessionLimit) : undefined,
      }));

    allocateMutation.mutate(
      {
        projectBudgetId,
        userId,
        allocatedHours: Number(allocatedHours),
        taskAllocations: formattedTaskAllocations.length > 0 ? formattedTaskAllocations : undefined,
      },
      {
        onSuccess: () => {
          setUserId('');
          setAllocatedHours('');
          setTaskAllocations({});
          onClose();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-250 p-4">
      <div className="w-full max-w-[540px] bg-card border border-border shadow-2xl rounded-[20px] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/50 shrink-0">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Allocate Budget to Member</h2>
          </div>
          <button 
            onClick={onClose}
            disabled={allocateMutation.isPending}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-card overflow-y-auto custom-scrollbar flex-1">
          
          {/* Member Selection */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Select Member <span className="text-destructive">*</span></label>
            <select 
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              disabled={allocateMutation.isPending}
              className="w-full h-[44px] px-3 rounded-[12px] border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer disabled:opacity-50"
            >
              <option value="" className="bg-card text-muted-foreground">Select team member...</option>
              {availableMembers.map((m) => (
                <option key={m.id} value={m.id} className="bg-card">
                  {m.firstName} {m.lastName} ({m.email})
                </option>
              ))}
            </select>
          </div>

          {/* Total Allocated Hours */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Total Allocated Hours <span className="text-destructive">*</span>
            </label>
            <input 
              type="number"
              step="0.5"
              min="0.5"
              value={allocatedHours}
              onChange={(e) => setAllocatedHours(e.target.value)}
              placeholder="e.g. 20" 
              required
              disabled={allocateMutation.isPending}
              className="w-full h-[44px] px-3 rounded-[12px] border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50"
            />
          </div>

          {/* Task Allocations Breakdown */}
          {availableTasks.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Task-Specific Allocations (Optional)</h3>
              </div>
              
              <div className="space-y-3">
                {availableTasks.map((task) => (
                  <div key={task.id} className="p-3 rounded-[12px] bg-background border border-border space-y-3">
                    <p className="text-xs font-bold text-foreground">{task.name}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-muted-foreground mb-1 block">Hours</label>
                        <input 
                          type="number"
                          step="0.5"
                          min="0"
                          value={taskAllocations[task.id]?.hours || ''}
                          onChange={(e) => handleTaskHoursChange(task.id, e.target.value)}
                          placeholder="Hours"
                          disabled={allocateMutation.isPending}
                          className="w-full h-[36px] px-2 rounded-[8px] border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground mb-1 block">Session Limit (Opt)</label>
                        <input 
                          type="number"
                          step="0.5"
                          min="0"
                          value={taskAllocations[task.id]?.sessionLimit || ''}
                          onChange={(e) => handleSessionLimitChange(task.id, e.target.value)}
                          placeholder="Max per session"
                          disabled={allocateMutation.isPending}
                          className="w-full h-[36px] px-2 rounded-[8px] border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer inside form for submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button 
              type="button"
              onClick={onClose}
              disabled={allocateMutation.isPending}
              className="px-4 py-2 h-[44px] rounded-[12px] text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={allocateMutation.isPending || !userId || !allocatedHours}
              className="flex items-center gap-2 px-5 py-2 h-[44px] rounded-[12px] bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {allocateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Allocating...
                </>
              ) : (
                'Allocate Budget'
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
