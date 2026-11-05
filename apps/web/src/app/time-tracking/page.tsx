'use client';

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  Calendar, 
  MoreVertical,
  Briefcase,
  Tag,
  Plus,
  Loader2,
  Inbox,
  AlertCircle,
  Edit,        
  Trash2,
  Clock, 
  History,
  ArrowRightLeft,
  X,
  Search,
  Lock,
  Unlock,
  CheckCircle2
} from 'lucide-react';

import { StartTimerModal } from '@/components/time-tracking/StartTimerModal';
import { LogTimeModal } from '@/components/time/LogTimeModal';
import { LogHistoryModal } from '@/components/time/LogHistoryModal'; 

import { useTimeEntries } from '@/features/time/api/get-time-entries';
import { useActiveTimer, useStopTimer, useStartTimer } from '@/features/time/api/log-time';
import { axiosInstance } from '@/lib/axios'; 
import toast from 'react-hot-toast'; 
import { useTheme } from 'next-themes'; 

import { useMoveTimeEntry } from '@/features/time-tracking/api/move-time-entry'; 

interface DayGroup {
  date: string;
  totalHours: string;
  entries: any[];
}

const formatDuration = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
};

const getSafeArray = (data: any) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.timeEntries)) return data.timeEntries;
  if (Array.isArray(data.timesheets)) return data.timesheets;
  if (data.data && Array.isArray(data.data.timeEntries)) return data.data.timeEntries;
  if (data.data && Array.isArray(data.data.timesheets)) return data.data.timesheets;
  return [];
};

const groupEntriesByDay = (entries: any[]) => {
  const groups: { [key: string]: DayGroup } = {};
  
  entries.forEach(entry => {
    const dateObj = new Date(entry.date);
    const isToday = new Date().toDateString() === dateObj.toDateString();
    const dateStr = isToday 
      ? `Today, ${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` 
      : dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    if (!groups[dateStr]) {
      groups[dateStr] = { date: dateStr, totalHours: '0:00', entries: [] };
    }
    groups[dateStr].entries.push(entry);
  });

  Object.values(groups).forEach(group => {
    const total = group.entries
      .filter(e => e.approvalStatus !== 'REJECTED')
      .reduce((sum, entry) => sum + Number(entry.duration), 0);
    group.totalHours = formatDuration(total);
  });

  return Object.values(groups).sort((a, b) => new Date(b.entries[0].date).getTime() - new Date(a.entries[0].date).getTime());
};

export default function TimeTrackingPage() {
  const [isInlineTimerRunning, setIsInlineTimerRunning] = useState(false);
  const [inlineSeconds, setInlineSeconds] = useState(0);
  const [inlineDescription, setInlineDescription] = useState('');

  const [isStartTimerModalOpen, setIsStartTimerModalOpen] = useState(false);
  const [isLogTimeModalOpen, setIsLogTimeModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const [historyEntryId, setHistoryEntryId] = useState<string | null>(null);
  const [moveEntryData, setMoveEntryData] = useState<any>(null);

  const { data: timesheetsData, isLoading, refetch } = useTimeEntries({ limit: 50 });
  const [unlockedEntries, setUnlockedEntries] = useState<string[]>([]);

  const [isManagerOrAdmin, setIsManagerOrAdmin] = useState(false);

  const { data: activeTimer } = useActiveTimer();
  const { mutate: stopBackendTimer, isPending: isStopping } = useStopTimer();

  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const solidMenuBg = isDark ? '#1E293B' : '#ffffff'; 
  const solidText = isDark ? '#ffffff' : '#0F172A';

  useEffect(() => {
    try {
      let roleFound = false;
      for (let i = 0; i < localStorage.length; i++) {
        const val = localStorage.getItem(localStorage.key(i) || '');
        if (!val) continue;

        const upperVal = val.toUpperCase();
        if (
          upperVal.includes('"ROLE":"ADMIN"') || 
          upperVal.includes('"ROLE":"MANAGER"') || 
          upperVal.includes('"ROLE":"SUPER_ADMIN"') ||
          upperVal.includes('"ROLE": "ADMIN"') || 
          upperVal.includes('"ROLE": "MANAGER"')
        ) {
          roleFound = true;
          break;
        }

        if (val.includes('ey') && val.split('.').length === 3) {
          try {
            const parts = val.split('.');
            parts.forEach(part => {
              try {
                const decoded = atob(part).toUpperCase();
                if (decoded.includes('"ADMIN"') || decoded.includes('"MANAGER"')) {
                   roleFound = true;
                }
              } catch(e) {}
            });
          } catch(e) {}
        }
      }

      const cookies = document.cookie.toUpperCase();
      if (cookies.includes('ADMIN') || cookies.includes('MANAGER')) {
        roleFound = true;
      }

      setIsManagerOrAdmin(roleFound);
    } catch(err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (activeTimer) {
      setIsInlineTimerRunning(activeTimer.status === 'RUNNING');
      if (activeTimer.notes) setInlineDescription(activeTimer.notes);
      
      const calcSecs = () => {
        const start = new Date(activeTimer.startedAt).getTime();
        if (activeTimer.status === 'RUNNING') {
           const now = new Date().getTime();
           const elapsed = Math.floor((now - start) / 1000) - activeTimer.totalPausedSeconds;
           setInlineSeconds(elapsed > 0 ? elapsed : 0);
        } else {
           const pauseTime = new Date(activeTimer.pausedAt).getTime();
           const elapsed = Math.floor((pauseTime - start) / 1000) - activeTimer.totalPausedSeconds;
           setInlineSeconds(elapsed > 0 ? elapsed : 0);
        }
      };

      calcSecs();
      let interval: NodeJS.Timeout | null = null;
      if (activeTimer.status === 'RUNNING') {
         interval = setInterval(calcSecs, 1000);
      }
      return () => { if (interval) clearInterval(interval); };
    } else {
      let interval: NodeJS.Timeout | null = null;
      if (isInlineTimerRunning) {
        interval = setInterval(() => {
          setInlineSeconds((prev) => prev + 1);
        }, 1000);
      }
      return () => { if (interval) clearInterval(interval); };
    }
  }, [isInlineTimerRunning, activeTimer]);

  const formatInlineTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStopInlineTimer = () => {
    setIsInlineTimerRunning(false);
    
    if (activeTimer) {
      stopBackendTimer({ id: activeTimer.id, notes: inlineDescription }, {
        onSuccess: (res: any) => {
           setInlineSeconds(0);
           setInlineDescription('');
           setEditData(res?.data?.timeEntry); 
           setIsLogTimeModalOpen(true);
        }
      });
      return;
    }

    if (inlineSeconds > 0) {
      const durationHours = (inlineSeconds / 3600).toFixed(2);
      setEditData({ duration: durationHours, description: inlineDescription });
      setIsLogTimeModalOpen(true);
      setInlineSeconds(0);
      setInlineDescription('');
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!window.confirm('Are you sure you want to delete this time entry? This action cannot be undone.')) return;
    
    try {
      await axiosInstance.delete(`/time-entries/${entryId}`);
      toast.success('Time entry deleted successfully');
      refetch(); 
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete entry');
    }
  };

  const toggleUnlock = (id: string) => {
    setUnlockedEntries(prev => prev.includes(id) ? prev.filter(eId => eId !== id) : [...prev, id]);
  };

  const rawEntries = getSafeArray(timesheetsData);
  const recentEntries = groupEntriesByDay(rawEntries);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 py-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Time Tracking
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Log your hours, manage timesheets, and track project progress.
          </p>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setIsStartTimerModalOpen(true)} className="btn-primary h-[38px] px-4 text-sm flex items-center gap-2">
              <Play className="h-4 w-4 fill-current" /> Open Timer
            </button>
            <button onClick={() => { setEditData(null); setIsLogTimeModalOpen(true); }} className="btn-secondary h-[38px] px-4 text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" /> Manual Log
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-3 items-center w-full xl:w-auto bg-card py-3.5 rounded-[16px] border border-border shadow-md divide-x divide-border">
          <div className="flex flex-col items-center justify-center px-6 lg:px-8">
            <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold mb-1">Today</span>
            <span className="text-foreground text-xl sm:text-2xl font-bold leading-none">
              {recentEntries.length > 0 && recentEntries[0].date.includes('Today') ? recentEntries[0].totalHours : '0:00'}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center px-6 lg:px-8">
            <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold mb-1">Week</span>
            <span className="text-primary text-xl sm:text-2xl font-bold leading-none">-</span>
          </div>
          <div className="flex flex-col items-center justify-center px-6 lg:px-8">
            <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold mb-1">Month</span>
            <span className="text-info text-xl sm:text-2xl font-bold leading-none">-</span>
          </div>
        </div>
      </div>

      <div className="enterprise-card p-3 sm:p-4 bg-card border-t-4 border-t-primary">
        <div className="flex flex-col lg:flex-row items-center gap-3 w-full">
          <div className="flex-1 w-full">
            <input 
              type="text" 
              placeholder="What are you working on right now?" 
              value={inlineDescription}
              onChange={(e) => setInlineDescription(e.target.value)}
              className="w-full h-[44px] rounded-[10px] bg-transparent px-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:bg-accent transition-all border border-transparent hover:border-border" 
            />
          </div>
          <div className="hidden lg:block w-px h-8 bg-border mx-2"></div>
          <div className="flex items-center gap-2 w-full lg:w-auto shrink-0">
            <button onClick={() => setIsStartTimerModalOpen(true)} className="flex items-center gap-2 h-[44px] px-3 rounded-[10px] border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex-1 lg:flex-none justify-center">
              <Briefcase className="h-4 w-4 text-info" />
              <span className="text-sm font-medium">Select Project</span>
            </button>
          </div>
          <div className="hidden lg:block w-px h-8 bg-border mx-2"></div>
          <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end shrink-0">
            <input 
              type="text" 
              readOnly 
              value={formatInlineTime(inlineSeconds)} 
              className={`w-[100px] text-right font-mono text-xl font-bold bg-transparent focus:outline-none rounded px-2 h-[44px] cursor-default transition-colors ${isInlineTimerRunning ? 'text-success' : 'text-foreground'}`} 
            />
            {isInlineTimerRunning ? (
              <button disabled={isStopping} onClick={handleStopInlineTimer} className="flex items-center justify-center gap-2 px-5 h-[44px] rounded-[10px] bg-destructive hover:bg-destructive/90 text-white text-sm font-semibold transition-all shadow-md w-[120px] disabled:opacity-50">
                {isStopping ? <Loader2 className="h-4 w-4 animate-spin"/> : <Square className="h-4 w-4 fill-current" />} Stop
              </button>
            ) : (
              <button onClick={() => setIsStartTimerModalOpen(true)} className="flex items-center justify-center gap-2 px-5 h-[44px] rounded-[10px] bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all shadow-md w-[120px]">
                <Play className="h-4 w-4 fill-current" /> Start
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : recentEntries.length > 0 ? (
          recentEntries.map((dayGroup, index) => (
            <div key={index} className="enterprise-table-container flex flex-col overflow-hidden">
              <div className="bg-card px-5 py-3.5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground text-sm">{dayGroup.date}</h3>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-bold text-foreground">{dayGroup.totalHours}h</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border bg-background">
                    <tr>
                      <th className="px-6 py-4 font-bold">Task & Project</th>
                      <th className="px-4 py-4 font-bold">Notes & Status</th>
                      {/* 🟢 BULLETPROOF CENTER WRAPPER */}
                      <th className="px-4 py-4 font-bold">
                        <div className="flex justify-center w-full">Billing</div>
                      </th>
                      <th className="px-4 py-4 font-bold text-right">Duration</th>
                      <th className="px-6 py-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayGroup.entries.map((entry) => {
                      const statusStr = String(entry.approvalStatus || entry.status || '').toUpperCase();
                      const isApproved = statusStr === 'APPROVED';
                      const isTemporarilyUnlocked = unlockedEntries.includes(entry.id);
                      const isLockedForAction = isApproved && !isTemporarilyUnlocked;

                      return (
                      <tr key={entry.id} className={`enterprise-table-row group transition-colors ${isLockedForAction ? 'hover:bg-accent/30 opacity-90' : 'hover:bg-accent/50'}`}>
                        <td className="enterprise-table-cell w-[40%] pl-6">
                          <div className="font-medium text-foreground mb-1 group-hover:text-info transition-colors">
                            {entry.task?.name || 'Unknown Task'}
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground gap-2">
                            <span className="font-medium text-primary">{entry.project?.client?.name || 'Internal'}</span>
                            <span className="w-1 h-1 rounded-full bg-border"></span>
                            <span>{entry.project?.name || 'Unknown Project'}</span>
                          </div>
                        </td>
                        <td className="enterprise-table-cell text-muted-foreground text-sm px-4">
                          {entry.description ? (
                            <span className="line-clamp-1 max-w-[200px]">{entry.description}</span>
                          ) : (
                            <span className="italic opacity-50">-</span>
                          )}
                          
                          {isApproved && (
                            <div className="text-[11px] text-emerald-400 mt-1.5 font-bold bg-emerald-500/10 p-1.5 rounded w-fit border border-emerald-500/20 flex items-center gap-1.5 shadow-sm">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Approved
                            </div>
                          )}
                          {statusStr === 'DRAFT' && (
                            <div className="text-[11px] text-indigo-400 mt-1.5 font-bold bg-indigo-500/10 p-1.5 rounded w-fit border border-indigo-500/20 flex items-center gap-1.5 shadow-sm">
                              <Clock className="w-3.5 h-3.5 shrink-0" /> Draft (Pending Submit)
                            </div>
                          )}
                          {entry.approvalStatus === 'REJECTED' && entry.rejectionReason && (
                            <div className="text-[11px] text-[#FF453A] mt-1.5 font-bold bg-[#FF453A]/10 p-1.5 rounded w-fit border border-[#FF453A]/20 flex items-center gap-1.5 shadow-sm">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Fix Requested: <span className="font-medium text-muted-foreground ml-0.5">{entry.rejectionReason}</span>
                            </div>
                          )}
                          {entry.approvalStatus === 'PENDING' && entry.isResubmitted && (
                            <div className="text-[11px] text-[#F59E0B] mt-1.5 font-bold bg-[#F59E0B]/10 p-1.5 rounded w-fit border border-[#F59E0B]/20 flex items-center gap-1.5 shadow-sm">
                              <Clock className="w-3.5 h-3.5 shrink-0" /> Resubmitted: <span className="font-medium text-muted-foreground ml-0.5">Pending Manager Review</span>
                            </div>
                          )}
                        </td>
                        
                        {/* 🟢 BULLETPROOF CENTER WRAPPER */}
                        <td className="enterprise-table-cell px-4">
                          <div className="flex justify-center items-center w-full">
                            <span className={`badge-base ${entry.isBillable ? 'badge-paid' : 'badge-cancelled'}`}>
                              {entry.isBillable ? 'Billable' : 'Non-Billable'}
                            </span>
                          </div>
                        </td>

                        <td className="enterprise-table-cell font-mono font-bold text-foreground text-right text-base px-4">
                          {entry.duration}h
                        </td>
                        <td className="enterprise-table-cell text-right w-[60px] pr-6">
                          
                          {isLockedForAction ? (
                            <div className="flex justify-end items-center pr-2">
                              {isManagerOrAdmin ? (
                                <button
                                  onClick={() => toggleUnlock(entry.id)}
                                  className="p-1.5 inline-flex items-center justify-center text-amber-500 hover:bg-amber-500/10 rounded-md transition-all border border-amber-500/30 text-xs gap-1"
                                  title="Click to Temporarily Unlock"
                                >
                                  <Lock className="w-3.5 h-3.5" /> Unlock
                                </button>
                              ) : (
                                <span className="p-1.5 inline-flex items-center justify-center text-muted-foreground opacity-50 cursor-not-allowed" title="Approved & Locked">
                                  <Lock className="w-4 h-4" />
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2 pr-2">
                              {isTemporarilyUnlocked && isManagerOrAdmin && (
                                <button
                                  onClick={() => toggleUnlock(entry.id)}
                                  className="p-1.5 inline-flex items-center justify-center text-success hover:bg-success/10 rounded-md transition-all border border-success/30"
                                  title="Lock again"
                                >
                                  <Unlock className="w-3.5 h-3.5" />
                                </button>
                              )}
                              
                              <div className="relative flex items-center justify-center w-8 h-8 rounded-md bg-accent/50 hover:bg-accent border border-border/50 shadow-sm transition-colors">
                                <MoreVertical className="absolute w-5 h-5 text-foreground pointer-events-none" style={{ zIndex: 1 }} />
                                
                                <select
                                  title="Actions"
                                  className="absolute inset-0 w-full h-full cursor-pointer dark:[color-scheme:dark]"
                                  style={{ opacity: 0, zIndex: 10, appearance: 'none', WebkitAppearance: 'none' }}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'edit') { setEditData(entry); setIsLogTimeModalOpen(true); }
                                    if (val === 'move') { setMoveEntryData({ ...entry, isOverride: unlockedEntries.includes(entry.id) }); }
                                    if (val === 'history') { setHistoryEntryId(entry.id); }
                                    if (val === 'delete') { handleDeleteEntry(entry.id); }
                                    e.target.value = '';
                                  }}
                                  value=""
                                >
                                  <option value="" disabled hidden></option>
                                  <option value="edit" style={{ backgroundColor: solidMenuBg, color: solidText }}>{statusStr === 'DRAFT' ? '📝 Review & Submit' : '✏️ Edit Entry'}</option>
                                  <option value="move" style={{ backgroundColor: solidMenuBg, color: solidText }}>🔄 Move Entry</option>
                                  <option value="history" style={{ backgroundColor: solidMenuBg, color: solidText }}>🕒 View History</option>
                                  <option value="delete" style={{ backgroundColor: solidMenuBg, color: solidText }}>🗑️ Delete</option>
                                </select>
                              </div>

                            </div>
                          )}

                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        ) : (
           <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card rounded-[16px] border border-dashed border-border">
              <Inbox className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">No time entries recorded yet.</p>
           </div>
        )}
      </div>

      <StartTimerModal isOpen={isStartTimerModalOpen} onClose={() => setIsStartTimerModalOpen(false)} />
      <LogTimeModal 
        isOpen={isLogTimeModalOpen} 
        onClose={() => { setIsLogTimeModalOpen(false); setEditData(null); refetch(); }} 
        editData={editData}
      />
      <LogHistoryModal 
        isOpen={!!historyEntryId} 
        onClose={() => setHistoryEntryId(null)} 
        entryId={historyEntryId} 
      />
      
      {moveEntryData && (
        <MoveTimeEntryModal 
          entry={moveEntryData} 
          onClose={() => { setMoveEntryData(null); refetch(); }} 
        />
      )}
    </div>
  );
}

const MoveTimeEntryModal = ({ entry, onClose }: { entry: any, onClose: () => void }) => {
  const [moveMode, setMoveMode] = useState<'TASK' | 'PROJECT'>('TASK');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  
  const [currentPlanTasks, setCurrentPlanTasks] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const [cnrFile, setCnrFile] = useState<File | null>(null);
  const [attendanceFile, setAttendanceFile] = useState<File | null>(null);
  
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isProcessingMatch, setIsProcessingMatch] = useState(false);

  const { mutate: moveEntry, isPending: isSubmitting } = useMoveTimeEntry();

  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const solidModalBg = isDark ? '#0F172A' : '#ffffff';
  const solidHeaderBg = isDark ? '#1E293B' : '#F8FAFC';
  const solidBorder = isDark ? '#334155' : '#e2e8f0';
  const solidInputBg = isDark ? '#1E293B' : '#F1F5F9';
  const solidText = isDark ? '#ffffff' : '#0F172A';

  useEffect(() => {
    if (moveMode === 'TASK') {
      setIsLoadingData(true);
      axiosInstance.get(`/tasks?projectId=${entry.projectId}`)
        .then(res => {
          const tasksData = res.data?.data?.tasks || res.data?.tasks || (Array.isArray(res.data?.data) ? res.data.data : []);
          setCurrentPlanTasks(Array.isArray(tasksData) ? tasksData : []);
        })
        .catch(err => {
          console.error("Task fetch error:", err);
          setCurrentPlanTasks([]);
        })
        .finally(() => setIsLoadingData(false));
    }
  }, [moveMode, entry.projectId]);

  useEffect(() => {
    if (moveMode === 'PROJECT' && searchQuery.length >= 2) {
      setIsLoadingData(true);
      const timer = setTimeout(() => {
        axiosInstance.get(`/projects?search=${searchQuery}`)
          .then(res => {
            const projectsData = res.data?.data?.projects || res.data?.projects || (Array.isArray(res.data?.data) ? res.data.data : []);
            setProjectsList(Array.isArray(projectsData) ? projectsData : []);
          })
          .catch(err => {
            console.error("Project fetch error:", err);
            setProjectsList([]);
          })
          .finally(() => setIsLoadingData(false));
      }, 400); 
      return () => clearTimeout(timer);
    } else if (moveMode === 'PROJECT' && searchQuery.length < 2) {
      setProjectsList([]); 
    }
  }, [moveMode, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let finalProjectId = entry.projectId;
    let finalTaskId: string | null = null;

    if (moveMode === 'TASK') {
      if (!selectedTaskId) return setError('Please select a task to move the time to.');
      finalTaskId = selectedTaskId;
    } 
    else if (moveMode === 'PROJECT') {
      if (!selectedProjectId) return setError('Please search and select a target plan.');
      finalProjectId = selectedProjectId;
      
      setIsProcessingMatch(true);
      try {
        const res = await axiosInstance.get(`/tasks?projectId=${selectedProjectId}`);
        const targetTasks = res.data?.data?.tasks || res.data?.tasks || (Array.isArray(res.data?.data) ? res.data.data : []);
        const originalTaskName = entry.task?.name?.toLowerCase();
        
        const matchedTask = Array.isArray(targetTasks) 
          ? targetTasks.find((t: any) => t.name?.toLowerCase() === originalTaskName) 
          : null;
          
        finalTaskId = matchedTask ? matchedTask.id : null; 
      } catch (err) {
        finalTaskId = null; 
      }
      setIsProcessingMatch(false);
    }

    moveEntry(
      {
        id: entry.id,
        newProjectId: finalProjectId,
        newTaskId: finalTaskId,
        reason,
        cnrDocument: cnrFile,            
        attendanceDocument: attendanceFile, 
        isManagerOverride: entry.isOverride || false
      },
      {
        onSuccess: () => {
          toast.success('Time entry moved successfully!');
          onClose();
        },
        onError: (err: any) => {
          setError(err.response?.data?.message || err.message || 'Failed to move time entry');
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div 
        className="w-full max-w-md rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{ backgroundColor: solidModalBg, border: `1px solid ${solidBorder}` }}
      >
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: solidBorder, backgroundColor: solidHeaderBg }}>
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: solidText }}>
            <ArrowRightLeft className="w-5 h-5 text-info" /> Move Time Entry
          </h3>
          <button onClick={onClose} className="transition-colors" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-5" style={{ backgroundColor: solidModalBg }}>
          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Original Entry</label>
            <div className="p-3 rounded-lg border" style={{ backgroundColor: solidHeaderBg, borderColor: solidBorder }}>
              <span className="block text-xs mb-1" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>From Plan/Project</span>
              <span className="block font-medium leading-snug" style={{ color: solidText }}>
                {entry.project?.name || 'Unknown Project'}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Time & Notes to Move</label>
            <div className="p-3 rounded-lg border flex justify-between items-center gap-4" style={{ backgroundColor: solidHeaderBg, borderColor: solidBorder }}>
              <span className="block text-sm italic line-clamp-2" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                {entry.description || 'No specific notes provided'}
              </span>
              <div className="text-right shrink-0">
                <span className="block font-bold text-xl" style={{ color: solidText }}>{entry.duration}h</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t" style={{ borderColor: solidBorder }}>
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Where do you want to move it?</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button" 
                onClick={() => setMoveMode('TASK')} 
                className={`p-3 rounded-lg border text-sm font-medium transition-all text-left ${moveMode === 'TASK' ? 'bg-primary/10 border-primary text-primary' : ''}`}
                style={moveMode !== 'TASK' ? { backgroundColor: solidHeaderBg, borderColor: solidBorder, color: isDark ? '#94A3B8' : '#64748B' } : undefined}
              >
                Move to other task
                <span className="block text-[10px] mt-1 opacity-70 font-normal">Within same plan</span>
              </button>
              <button 
                type="button" 
                onClick={() => setMoveMode('PROJECT')} 
                className={`p-3 rounded-lg border text-sm font-medium transition-all text-left ${moveMode === 'PROJECT' ? 'bg-info/10 border-info text-info' : ''}`}
                style={moveMode !== 'PROJECT' ? { backgroundColor: solidHeaderBg, borderColor: solidBorder, color: isDark ? '#94A3B8' : '#64748B' } : undefined}
              >
                Move to other plan
                <span className="block text-[10px] mt-1 opacity-70 font-normal">Transfer to different project</span>
              </button>
            </div>
          </div>

          <div className="min-h-[70px]">
            {moveMode === 'TASK' ? (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                <label className="text-sm font-medium" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Select New Task</label>
                <select 
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full h-[44px] text-sm rounded-lg px-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all dark:[color-scheme:dark]"
                  style={{ backgroundColor: solidInputBg, border: `1px solid ${solidBorder}`, color: solidText }}
                >
                  <option value="" disabled style={{ backgroundColor: solidInputBg, color: solidText }}>-- Select target task --</option>
                  {currentPlanTasks.map(t => (
                    <option key={t.id} value={t.id} style={{ backgroundColor: solidInputBg, color: solidText }}>{t.name}</option>
                  ))}
                </select>
                {isLoadingData && <span className="text-xs flex items-center gap-1 mt-1" style={{ color: isDark ? '#94A3B8' : '#64748B' }}><Loader2 className="w-3 h-3 animate-spin"/> Loading tasks...</span>}
              </div>
            ) : (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                <label className="text-sm font-medium" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Search Target Plan</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: isDark ? '#94A3B8' : '#64748B' }} />
                  <input 
                    type="text"
                    placeholder="Search by client, plan, or HCAI number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-[44px] text-sm rounded-lg pl-9 pr-3 focus:outline-none focus:border-info focus:ring-1 focus:ring-info transition-all"
                    style={{ backgroundColor: solidInputBg, border: `1px solid ${solidBorder}`, color: solidText }}
                  />
                </div>
                
                {projectsList.length > 0 && (
                  <div className="max-h-[160px] overflow-y-auto rounded-lg mt-2 shadow-lg custom-scrollbar" style={{ backgroundColor: solidModalBg, border: `1px solid ${solidBorder}` }}>
                    {projectsList.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => { setSelectedProjectId(p.id); setSearchQuery(p.name); setProjectsList([]); }}
                        className={`p-3 text-sm cursor-pointer transition-colors ${selectedProjectId === p.id ? 'bg-info/20 text-foreground' : ''}`}
                        style={selectedProjectId !== p.id ? { color: isDark ? '#94A3B8' : '#64748B' } : undefined}
                      >
                        {p.name}
                      </div>
                    ))}
                  </div>
                )}
                {isLoadingData && <span className="text-xs flex items-center gap-1 mt-1" style={{ color: isDark ? '#94A3B8' : '#64748B' }}><Loader2 className="w-3 h-3 animate-spin"/> Searching plans...</span>}
              </div>
            )}
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-sm font-medium" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Reason for Moving</label>
            <textarea 
              placeholder="E.g., Accidentally logged time to the wrong plan"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all min-h-[80px] resize-none"
              style={{ backgroundColor: solidInputBg, border: `1px solid ${solidBorder}`, color: solidText }}
            />
          </div>

          <div className="space-y-2 pt-2 border-t" style={{ borderColor: solidBorder }}>
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Missing Compliance? (Optional)</label>
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border" style={{ backgroundColor: solidHeaderBg, borderColor: solidBorder }}>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-medium" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Clinical Notes</label>
                <input 
                  type="file" 
                  accept="application/pdf,.doc,.docx,image/*"
                  onChange={(e) => setCnrFile(e.target.files?.[0] || null)}
                  className="text-[10px] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-info/10 file:text-info hover:file:bg-info/20 w-full"
                  style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-medium" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Attendance</label>
                <input 
                  type="file" 
                  accept="application/pdf,.doc,.docx,image/*"
                  onChange={(e) => setAttendanceFile(e.target.files?.[0] || null)}
                  className="text-[10px] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-info/10 file:text-info hover:file:bg-info/20 w-full"
                  style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t" style={{ borderColor: solidBorder }}>
            <button 
              type="button" 
              onClick={onClose}
              disabled={isSubmitting || isProcessingMatch}
              className="px-4 py-2 text-sm font-medium bg-transparent border hover:bg-accent rounded-lg transition-colors h-[42px]"
              style={{ color: solidText, borderColor: solidBorder }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || isProcessingMatch || (moveMode === 'TASK' && !selectedTaskId) || (moveMode === 'PROJECT' && !selectedProjectId)}
              className="px-4 py-2 text-sm font-medium text-white bg-info hover:bg-info/90 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 h-[42px] min-w-[120px] justify-center shadow-md"
            >
              {(isSubmitting || isProcessingMatch) ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
              {(isSubmitting || isProcessingMatch) ? 'Moving...' : 'Move Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
