'use client';

import React, { useState, useEffect } from 'react';
import { X, Play, Square, Clock, FileText, Loader2, Briefcase } from 'lucide-react';
import { useLogTime, useActiveTimer, useStartTimer, usePauseTimer, useResumeTimer, useStopTimer } from '@/features/time/api/log-time';
import { axiosInstance } from '@/lib/axios'; 
import toast from 'react-hot-toast';
import { useTheme } from 'next-themes';
import { useOrganization } from '@/features/organizations/api/get-organization'; // 🟢 NEW: Fetched for feature toggling

interface StartTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StartTimerModal({ isOpen, onClose }: StartTimerModalProps) {
  const { data: activeTimer } = useActiveTimer();
  const { mutate: startBackendTimer, isPending: isStarting } = useStartTimer();
  const { mutate: pauseBackendTimer, isPending: isPausing } = usePauseTimer();
  const { mutate: resumeBackendTimer, isPending: isResuming } = useResumeTimer();
  const { mutate: stopBackendTimer, isPending: isStopping } = useStopTimer();

  const [projectId, setProjectId] = useState('');
  const [taskId, setTaskId] = useState(''); 
  const [description, setDescription] = useState('');
  
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const { mutate: logTime, isPending: isManualLogging } = useLogTime();

  const { data: currentOrganization } = useOrganization(); // 🟢 NEW: Get current org context
  const isHealthcare = currentOrganization?.industryType === 'HEALTHCARE'; // 🟢 Feature Toggle Flag

  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  
  // 🟢 STRICT INLINE COLORS TO FORCE 100% OPACITY
  const solidModalBg = isDark ? '#0F172A' : '#ffffff';
  const solidInputBg = isDark ? '#1E293B' : '#F1F5F9';
  const solidText = isDark ? '#ffffff' : '#0F172A';
  const solidBorder = isDark ? '#334155' : '#e2e8f0';

  useEffect(() => {
    if (activeTimer) {
      setIsActive(activeTimer.status === 'RUNNING');
      setProjectId(activeTimer.projectId);
      setTaskId(activeTimer.taskId);
      setDescription(activeTimer.notes || '');

      const calculateSeconds = () => {
        const start = new Date(activeTimer.startedAt).getTime();
        if (activeTimer.status === 'RUNNING') {
           const now = new Date().getTime();
           const elapsed = Math.floor((now - start) / 1000) - activeTimer.totalPausedSeconds;
           setSeconds(elapsed > 0 ? elapsed : 0);
        } else {
           const pauseTime = new Date(activeTimer.pausedAt).getTime();
           const elapsed = Math.floor((pauseTime - start) / 1000) - activeTimer.totalPausedSeconds;
           setSeconds(elapsed > 0 ? elapsed : 0);
        }
      };

      calculateSeconds();
      let interval: NodeJS.Timeout | null = null;
      if (activeTimer.status === 'RUNNING') {
        interval = setInterval(calculateSeconds, 1000);
      }
      return () => { if (interval) clearInterval(interval); };
    } else {
      setIsActive(false);
    }
  }, [activeTimer]);

  useEffect(() => {
    if (activeTimer) return; 
    let interval: NodeJS.Timeout | null = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else if (!isActive && seconds !== 0 && interval) {
      clearInterval(interval);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, seconds, activeTimer]);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingData(true);
      axiosInstance.get('/projects')
        .then(res => {
          const p = res.data?.data?.projects || res.data?.projects || (Array.isArray(res.data?.data) ? res.data.data : []);
          setProjects(Array.isArray(p) ? p : []);
        })
        .catch(err => console.error("Projects fetch error", err))
        .finally(() => setIsLoadingData(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (projectId && isOpen) {
      setIsLoadingData(true);
      axiosInstance.get(`/tasks?projectId=${projectId}`)
        .then(res => {
          let tData = res.data?.data?.tasks || res.data?.tasks || res.data?.data || res.data || [];
          setTasks(Array.isArray(tData) ? tData : []);
        })
        .catch(err => console.error("Tasks fetch error", err))
        .finally(() => setIsLoadingData(false));
    } else {
      setTasks([]);
    }
  }, [projectId, isOpen]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const handleStartStop = () => {
    if (activeTimer) {
      if (activeTimer.status === 'RUNNING') pauseBackendTimer(activeTimer.id);
      else resumeBackendTimer(activeTimer.id);
    } else {
      if (!projectId || !taskId) {
        toast.error(`Please select a ${isHealthcare ? 'case' : 'project'} and task before starting the timer.`);
        return;
      }
      startBackendTimer({ projectId, taskId, notes: description });
    }
  };

  const handleSaveTimer = () => {
    if (seconds === 0) {
      toast.error("Timer hasn't run yet!");
      return;
    }

    setIsActive(false);

    if (activeTimer) {
      stopBackendTimer({ id: activeTimer.id, notes: description }, {
        onSuccess: () => {
          setSeconds(0);
          setProjectId('');
          setTaskId('');
          setDescription('');
          onClose();
        }
      });
    } else {
      const durationHours = seconds / 3600;
      logTime({
        projectId,
        taskId,
        duration: durationHours,
        date: new Date().toISOString(),
        description,
        isBillable: true, 
      } as any, {
        onSuccess: () => {
          setSeconds(0);
          setProjectId('');
          setTaskId('');
          setDescription('');
          onClose();
        }
      });
    }
  };

  const handleClose = () => {
    if (isActive || seconds > 0) {
      if (!window.confirm("You have an active or unsaved timer. Are you sure you want to close?")) {
        return;
      }
    }
    setIsActive(false);
    setSeconds(0);
    setProjectId('');
    setTaskId('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div 
        className="w-full max-w-md shadow-2xl rounded-[20px] overflow-hidden"
        style={{ backgroundColor: solidModalBg, border: `1px solid ${solidBorder}` }}
      >
        
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: solidBorder, backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }}>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#3B82F6]" />
            <h2 className="text-lg font-bold" style={{ color: solidText }}>Live Timer</h2>
          </div>
          <button 
            onClick={handleClose}
            disabled={isStarting || isPausing || isResuming || isStopping || isManualLogging || isLoadingData}
            className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
            style={{ color: isDark ? '#94A3B8' : '#64748B' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col items-center justify-center py-6 rounded-[16px] shadow-sm border" style={{ backgroundColor: solidInputBg, borderColor: solidBorder }}>
            <div className={`text-5xl font-mono font-bold tracking-wider mb-2 ${isActive ? 'text-[#22C55E] animate-pulse' : ''}`} style={{ color: isActive ? '#22C55E' : solidText }}>
              {formatTime(seconds)}
            </div>
            <p className="text-sm font-medium" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
              {isActive ? 'Tracking time...' : seconds > 0 ? 'Timer paused' : 'Ready to start'}
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                {isHealthcare ? 'Case / Patient' : 'Project'} <span className="text-[#EF4444]">*</span>
              </label>
              <select 
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setTaskId(''); 
                }}
                disabled={isActive || isStarting || !!activeTimer}
                className="w-full h-[44px] px-3 rounded-[12px] text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] transition-all cursor-pointer disabled:opacity-50 appearance-none"
                style={{ backgroundColor: solidInputBg, color: solidText, border: `1px solid ${solidBorder}` }}
              >
                <option value="" style={{ backgroundColor: solidInputBg, color: solidText }}>Select a {isHealthcare ? 'case' : 'project'}...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id} style={{ backgroundColor: solidInputBg, color: solidText }}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Task <span className="text-[#EF4444]">*</span></label>
              <select 
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                disabled={!projectId || isActive || isStarting || !!activeTimer}
                className="w-full h-[44px] px-3 rounded-[12px] text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] transition-all cursor-pointer disabled:opacity-50 appearance-none"
                style={{ backgroundColor: solidInputBg, color: solidText, border: `1px solid ${solidBorder}` }}
              >
                <option value="" style={{ backgroundColor: solidInputBg, color: solidText }}>Select a task...</option>
                {tasks.map(t => (
                  <option key={t.id} value={t.id} style={{ backgroundColor: solidInputBg, color: solidText }}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                <FileText className="w-3.5 h-3.5" /> What are you working on?
              </label>
              <input 
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Designing homepage UI" 
                disabled={isStarting || isStopping || isManualLogging}
                className="w-full h-[44px] px-3 rounded-[12px] text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] transition-all disabled:opacity-50"
                style={{ backgroundColor: solidInputBg, color: solidText, border: `1px solid ${solidBorder}` }}
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-between items-center gap-3" style={{ borderColor: solidBorder, backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }}>
          <button 
            onClick={handleStartStop}
            disabled={isStarting || isPausing || isResuming || isLoadingData}
            className={`flex items-center justify-center gap-2 h-[44px] w-[140px] rounded-[12px] text-white text-sm font-bold transition-all shadow-lg shrink-0 ${
              isActive 
                ? 'bg-[#EF4444] hover:bg-[#DC2626]' 
                : 'bg-[#22C55E] hover:bg-[#16A34A]'
            }`}
          >
            {isStarting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</>
            ) : isPausing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Pausing...</>
            ) : isResuming ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Resuming...</>
            ) : isActive ? (
              <><Square className="w-4 h-4 fill-current" /> Pause</>
            ) : (
              <><Play className="w-4 h-4 fill-current" /> {seconds > 0 ? 'Resume' : 'Start'}</>
            )}
          </button>

          <button 
            onClick={handleSaveTimer}
            disabled={seconds === 0 || isActive || isStopping || isManualLogging || isLoadingData}
            className="flex items-center justify-center gap-2 h-[44px] w-[140px] rounded-[12px] bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isStopping || isManualLogging ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              'Save Entry'
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
