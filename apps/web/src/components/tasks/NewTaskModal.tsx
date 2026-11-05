'use client';

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Loader2, Check, ShieldAlert, Trash2 } from 'lucide-react';
import { useOrgTasks } from '@/features/tasks/api/get-org-tasks';
import { useTasks } from '@/features/tasks/api/get-tasks';
import { axiosInstance } from '@/lib/axios';
import { useTheme } from 'next-themes';
import toast from 'react-hot-toast';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export function NewTaskModal({ isOpen, onClose, projectId }: NewTaskModalProps) {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [newTaskName, setNewTaskName] = useState('');
  const [isClinical, setIsClinical] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: orgTasks = [], isLoading: isLoadingOrgTasks } = useOrgTasks();
  const { data: existingProjectTasks = [] } = useTasks({ projectId });

  // 🟢 Theme specific variables to strictly fix the transparent background issue
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  
  const solidModalBg = isDark ? '#0F172A' : '#ffffff';
  const solidHeaderBg = isDark ? '#1E293B' : '#F8FAFC';
  const solidBorder = isDark ? '#334155' : '#e2e8f0';

  if (!isOpen) return null;

  // 🟢 THE FIX: 14 Permanent Healthcare Tasks injected directly into the UI
  const PERMANENT_HEALTHCARE_TASKS = [
    "Treatment Session (6VA50/6KA30 etc.)",
    "Assessment (HXXMR/HXXAC)",
    "Planning (7SF12)",
    "Travel (AXXTT)",
    "DR001",
    "5100 (TRAVEL)",
    "5101 (Reg OT treatment)",
    "File Research (7SF13)",
    "FORM COMPLETION",
    "7SF12 Communication",
    "Documentation (7SJ30)",
    "OCF-3 Disability Certificate Completion",
    "7SP60 Education",
    "5100C (ALL OT TREATMENT)"
  ];

  const existingTaskNames = existingProjectTasks.map(t => t.name.toLowerCase());
  
  // Combine permanent tasks with any dynamic org tasks, removing duplicates
  const combinedOrgTasks = Array.from(new Set([...PERMANENT_HEALTHCARE_TASKS, ...orgTasks]));
  
  // Filter out the ones that are already added to the project
  const availableTasks = combinedOrgTasks.filter(t => !existingTaskNames.includes(t.toLowerCase()));

  const toggleTask = (name: string) => {
    setSelectedTasks(prev => 
      prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]
    );
  };

  const handleDeleteCommonTask = async (e: React.MouseEvent, name: string) => {
    e.stopPropagation(); 
    if (!window.confirm(`Are you sure you want to permanently delete "${name}" from the common tasks list? This will hide it globally.`)) return;

    try {
      await axiosInstance.delete(`/tasks/organization-tasks/${encodeURIComponent(name)}`);
      toast.success(`"${name}" removed from common tasks!`);
      window.location.reload(); 
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete common task');
    }
  };

  const handleSaveTasks = async () => {
    const customTask = newTaskName.trim();
    if (selectedTasks.length === 0 && !customTask) return;

    setIsSubmitting(true);

    try {
      if (selectedTasks.length > 0) {
        await axiosInstance.post('/tasks/assign', {
          projectId,
          taskNames: selectedTasks
        });
      }

      if (customTask) {
        await axiosInstance.post('/tasks', {
          projectId,
          name: customTask,
          description: '',
          isBillable: true,
          requiresClinicalCompliance: Boolean(isClinical)
        });
      }

      toast.success('Tasks added successfully!');
      setSelectedTasks([]);
      setNewTaskName('');
      setIsClinical(false);
      onClose();
      window.location.reload(); 

    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error.message || "Failed to save tasks.";
      toast.error(`Error: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-250 p-4">
      {/* 🟢 Strictly applied solid background here */}
      <div 
        className="w-full max-w-md border shadow-2xl rounded-[20px] overflow-hidden flex flex-col max-h-[85vh]"
        style={{ backgroundColor: solidModalBg, borderColor: solidBorder }}
      >
        
        <div 
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ backgroundColor: solidHeaderBg, borderColor: solidBorder }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary" />
            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Add Tasks</h2>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6" style={{ backgroundColor: solidModalBg }}>
          
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">Common Tasks</label>
            {isLoadingOrgTasks ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading common tasks...
              </div>
            ) : availableTasks.length > 0 ? (
              <div className="space-y-2">
                {availableTasks.map((taskName) => {
                  const isSelected = selectedTasks.includes(taskName);
                  const isPermanent = PERMANENT_HEALTHCARE_TASKS.includes(taskName);
                  
                  return (
                    <div
                      key={taskName}
                      className={`w-full flex items-center justify-between p-3 rounded-[10px] border transition-all text-sm text-left ${
                        isSelected 
                          ? 'bg-primary/10 border-primary' 
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                      style={!isSelected ? { backgroundColor: solidModalBg } : {}}
                    >
                      <button 
                        className={`flex-1 text-left ${isSelected ? 'text-primary font-semibold' : (isDark ? 'text-slate-300' : 'text-slate-700')}`} 
                        onClick={() => toggleTask(taskName)}
                        disabled={isSubmitting}
                      >
                        {taskName}
                      </button>
                      <div className="flex items-center gap-3">
                        {!isSelected && !isPermanent && (
                          <button 
                            onClick={(e) => handleDeleteCommonTask(e, taskName)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1 rounded transition-colors"
                            title="Delete this common task globally"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => toggleTask(taskName)}
                          disabled={isSubmitting}
                          className={`w-5 h-5 rounded-[6px] border flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-primary border-primary text-white' : 'border-muted-foreground/50'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No common tasks available yet.</p>
            )}
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-border"></div>
            <span className="shrink-0 px-4 text-xs text-muted-foreground uppercase tracking-widest font-semibold">OR</span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Create New Task</label>
              <input 
                type="text" 
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="e.g. Treatment, Consultation..." 
                disabled={isSubmitting}
                className="w-full h-[44px] px-3 rounded-[12px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-muted-foreground"
                style={{ backgroundColor: isDark ? '#1E293B' : '#F8FAFC', color: isDark ? '#ffffff' : '#0F172A' }}
              />
            </div>

            <label 
              className={`flex items-center justify-between p-3.5 rounded-[12px] border transition-colors ${!newTaskName.trim() || isSubmitting ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-primary/50'}`}
              style={{ backgroundColor: solidHeaderBg, borderColor: solidBorder }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>Clinical Compliance</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Mandatory CNR & Attendance</span>
                </div>
              </div>
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  checked={isClinical}
                  onChange={(e) => setIsClinical(e.target.checked)}
                  disabled={isSubmitting || !newTaskName.trim()}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-300 dark:bg-slate-700 border border-transparent rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
              </div>
            </label>
            
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-xs text-primary leading-relaxed mt-4">
              💡 <b>Task Rate Management:</b> Task rates are dynamically managed inside the <b>Smart Budget Matrix</b>.
            </div>
            
          </div>
        </div>

        <div 
          className="px-6 py-4 border-t flex justify-end gap-3 shrink-0"
          style={{ backgroundColor: solidHeaderBg, borderColor: solidBorder }}
        >
          <button onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
          <button 
            type="button"
            onClick={handleSaveTasks}
            disabled={isSubmitting || (selectedTasks.length === 0 && !newTaskName.trim())}
            className={`flex items-center gap-2 px-5 py-2 rounded-[10px] bg-primary hover:bg-primary/95 text-sm font-semibold transition-all shadow-md disabled:opacity-50 disabled:shadow-none ${isDark ? 'text-white' : 'text-slate-900 font-bold'}`}
          >
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Tasks'}
          </button>
        </div>
      </div>
    </div>
  );
}
