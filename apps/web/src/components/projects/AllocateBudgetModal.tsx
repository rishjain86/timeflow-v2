'use client';

import React, { useState, useEffect } from 'react';
import { X, Briefcase, Loader2, Trash2, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';
import { useAllocateBudget } from '@/features/projects/api/allocate-budget';
import { useTasks } from '@/features/tasks/api/get-tasks';
import { useProjectBudget } from '@/features/projects/api/get-project-budget';
import { useTheme } from 'next-themes';

interface AllocateBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export function AllocateBudgetModal({ isOpen, onClose, projectId }: AllocateBudgetModalProps) {
  const { data: tasks = [] } = useTasks({ projectId });
  const { mutate: allocateBudget, isPending: isSaving } = useAllocateBudget();
  const { data: projectBudget, isLoading: isLoadingBudget } = useProjectBudget(projectId);

  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const solidModalBg = isDark ? '#0F172A' : '#ffffff';
  const solidHeaderBg = isDark ? '#1E293B' : '#F8FAFC';
  const solidBorder = isDark ? '#334155' : '#e2e8f0';
  const solidInputBg = isDark ? '#1E293B' : '#F1F5F9';
  const solidText = isDark ? '#ffffff' : '#0F172A';

  const { data: currentUser, isLoading: isLoadingAuth } = useQuery({
    queryKey: ['current-auth-user'],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get('/auth/me');
        return response.data?.data?.user || response.data?.user || response.data || null;
      } catch (error) {
        return null;
      }
    },
    enabled: isOpen,
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['organization-users'],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get('/users');
        return response.data?.data?.users || response.data?.data || response.data || [];
      } catch (error) {
        return [];
      }
    },
    enabled: isOpen,
  });

  const [allocatedTasks, setAllocatedTasks] = useState<{ 
    taskId: string; 
    allocatedHours: number; 
    sessions: number; 
    customRate?: number | null; 
    displayHrs?: string;
    assignedUsers: string[]; 
  }[]>([]);
  
  const [assignedMembers, setAssignedMembers] = useState<string[]>([]);
  const [isSavingRates, setIsSavingRates] = useState(false);
  const [taskDropdownOpen, setTaskDropdownOpen] = useState<string | null>(null);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);

  const masterProjectRate = projectBudget?.project?.hourlyRate ? Number(projectBudget.project.hourlyRate) : 0;

  const userRole = currentUser?.role;
  const isAuthorized = userRole ? ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(userRole) : false;

  useEffect(() => {
    if (!isOpen) {
      setHasLoadedInitialData(false);
    }
  }, [isOpen]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!isOpen || isLoadingAuth || !isAuthorized || !projectBudget || tasks.length === 0) return;
      if (hasLoadedInitialData) return; 

      try {
        const projRes = await axiosInstance.get(`/projects/${projectId}`);
        const projectData = projRes.data?.data?.project || projRes.data?.project;
        const desc = projectData?.description || '';

        // 🟢 FIX: Extract Master Rate from Description safely to prevent Blank Rates
        const rateRegex = /Hourly Approved Rate @\s*\$?([\d.]+)/i;
        const rateMatch = desc.match(rateRegex);
        const descMasterRate = rateMatch ? Number(rateMatch[1]) : 0;

        const regex = /• (.*?): ([\d.]+) hrs\/session x (\d+) sessions/g;
        let match;
        const parsedData: Record<string, { displayHrs: string, sessions: number }> = {};
        while ((match = regex.exec(desc)) !== null) {
          parsedData[match[1].trim()] = {
            displayHrs: match[2],
            sessions: parseInt(match[3], 10)
          };
        }

        const validBudgets = projectBudget.taskBudgets.filter((tb: any) => 
          tasks.some((t: any) => t.id === tb.taskId)
        );

        const newAllocatedTasks = validBudgets.map((tb: any) => {
          const taskInfo = tasks.find((t: any) => t.id === tb.taskId);
          const taskName = taskInfo?.name || '';
          
          const parsedTask = parsedData[taskName];
          const sessionsCount = parsedTask ? parsedTask.sessions : (tb.sessions || 1);
          const displayHrs = parsedTask ? parsedTask.displayHrs : '';
          
          const dbTotalHours = Number(tb.allocatedHours || 0);
          const trueHrsPerSession = sessionsCount > 0 ? dbTotalHours / sessionsCount : dbTotalHours;

          let taskRate = null;
          if (projectData?.projectTaskRates) {
            const pRate = projectData.projectTaskRates.find((pr: any) => pr.taskId === tb.taskId);
            if (pRate && pRate.customRate !== undefined && pRate.customRate !== null) {
              taskRate = pRate.customRate;
            }
          }
          if (taskRate === null && tb.task?.customProjectRates?.[0]?.customRate !== undefined) taskRate = tb.task.customProjectRates[0].customRate;
          if (taskRate === null && tb.task?.projectTaskRates?.[0]?.customRate !== undefined) taskRate = tb.task.projectTaskRates[0].customRate;
          if (taskRate === null && taskInfo?.projectTaskRates?.[0]?.customRate !== undefined) taskRate = taskInfo.projectTaskRates[0].customRate;
          if (taskRate === null && taskInfo?.customProjectRates?.[0]?.customRate !== undefined) taskRate = taskInfo.customProjectRates[0].customRate;

          // 🟢 SMART FALLBACK: Agar API ne rate clear kar diya, toh usko description ya master rate se wapas le aao
          if (taskRate === null || taskRate === undefined || String(taskRate) === '') {
             if (descMasterRate > 0) {
                taskRate = descMasterRate;
             } else if (masterProjectRate > 0) {
                taskRate = masterProjectRate;
             }
          }

          let assignedUsersForTask: string[] = [];
          if (taskInfo?.assignments && Array.isArray(taskInfo.assignments)) {
            assignedUsersForTask = taskInfo.assignments.map((a: any) => a.userId);
          } else if (taskInfo?.assignedToId) { 
             assignedUsersForTask = [taskInfo.assignedToId];
          }

          return {
            taskId: tb.taskId,
            allocatedHours: trueHrsPerSession,
            sessions: sessionsCount,
            customRate: taskRate !== null && taskRate !== undefined ? Number(taskRate) : null,
            displayHrs: displayHrs || String(Number(trueHrsPerSession.toFixed(4))),
            assignedUsers: assignedUsersForTask 
          };
        });

        if (isMounted) {
          setAllocatedTasks(newAllocatedTasks);
          setHasLoadedInitialData(true); 
        }

        if (projectBudget.memberBudgets && projectBudget.memberBudgets.length > 0) {
          setAssignedMembers(projectBudget.memberBudgets.map((mb: any) => mb.userId));
        } else {
          setAssignedMembers([]); 
        }

      } catch (error) {
        console.error("Failed to restore matrix data", error);
      }
    };

    loadData();

    return () => { isMounted = false; };
  }, [isOpen, projectBudget, tasks, isLoadingAuth, isAuthorized, projectId, hasLoadedInitialData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (taskDropdownOpen && !(event.target as Element).closest('.user-assignment-dropdown')) {
        setTaskDropdownOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [taskDropdownOpen]);

  if (!isOpen) return null;

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)' }}>
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-250" style={{ backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)' }}>
        <div className="border p-8 rounded-[20px] text-center max-w-md shadow-2xl flex flex-col items-center" style={{ backgroundColor: solidModalBg, borderColor: solidBorder }}>
          <div className="w-14 h-14 bg-destructive/20 text-destructive rounded-full flex items-center justify-center mb-5">
            <X className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold mb-3" style={{ color: solidText }}>Access Denied</h3>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            You do not have permission to access or modify budget allocations. Only users with Admin or Manager roles are authorized.
          </p>
          <button onClick={onClose} className="px-8 py-2.5 bg-primary hover:bg-primary/95 transition-all text-white rounded-[10px] text-sm font-semibold shadow-lg">
            Close Window
          </button>
        </div>
      </div>
    );
  }

  const handleAddTask = (taskId: string) => {
    if (!taskId) return;
    if (!allocatedTasks.find(t => t.taskId === taskId)) {
      setAllocatedTasks(prev => [...prev, { 
        taskId, 
        allocatedHours: 1, 
        sessions: 1, 
        customRate: null, 
        displayHrs: '1',
        assignedUsers: [] 
      }]);
    }
  };

  const updateTaskHours = (taskIndex: number, rawVal: string) => {
    const num = Number(rawVal) || 0;
    setAllocatedTasks(prev => {
      const newTasks = [...prev];
      newTasks[taskIndex] = { ...newTasks[taskIndex], allocatedHours: num, displayHrs: rawVal };
      return newTasks;
    });
  };

  const updateTaskSessions = (taskIndex: number, sessions: number) => {
    setAllocatedTasks(prev => {
      const newTasks = [...prev];
      newTasks[taskIndex] = { ...newTasks[taskIndex], sessions: sessions || 1 };
      return newTasks;
    });
  };

  const updateTaskRate = (taskIndex: number, rate: number | null) => {
    setAllocatedTasks(prev => {
      const newTasks = [...prev];
      newTasks[taskIndex] = { ...newTasks[taskIndex], customRate: rate };
      return newTasks;
    });
  };

  const toggleTaskUser = (taskIndex: number, userId: string) => {
    setAllocatedTasks(prev => {
      const newTasks = [...prev];
      const task = newTasks[taskIndex];
      const hasUser = task.assignedUsers.includes(userId);
      
      newTasks[taskIndex] = { 
        ...task, 
        assignedUsers: hasUser 
          ? task.assignedUsers.filter(id => id !== userId) 
          : [...task.assignedUsers, userId] 
      };
      
      if (!hasUser && !assignedMembers.includes(userId)) {
        setAssignedMembers(prevMembers => [...prevMembers, userId]);
      }
      
      return newTasks;
    });
  };

  const removeTask = (taskIndex: number) => {
    setAllocatedTasks(prev => prev.filter((_, i) => i !== taskIndex));
  };

  const toggleMember = (userId: string) => {
    setAssignedMembers(prev => {
      const isRemoving = prev.includes(userId);
      
      if (isRemoving) {
        setAllocatedTasks(tasks => tasks.map(t => ({
          ...t,
          assignedUsers: t.assignedUsers.filter(id => id !== userId)
        })));
        return prev.filter(id => id !== userId);
      }
      
      return [...prev, userId];
    });
  };

  const handleSave = () => {
    let finalTasks = [...allocatedTasks];
    let dr001Added = false;

    const treatmentTaskIndex = finalTasks.findIndex(t => {
      const tInfo = tasks.find((info: any) => info.id === t.taskId);
      return tInfo && tInfo.name.toLowerCase().includes('treatment');
    });

    const dr001Task = tasks.find((t: any) => t.name.toUpperCase().trim() === 'DR001');

    if (treatmentTaskIndex !== -1 && dr001Task && !finalTasks.some(t => t.taskId === dr001Task.id)) {
      const currentTreatment = finalTasks[treatmentTaskIndex];
      const totalTreatmentHours = currentTreatment.allocatedHours * currentTreatment.sessions;

      if (totalTreatmentHours > 2) {
        const confirmed = window.confirm(`Do you want to deduct 2 hours from Treatment budget for DR001?`);
        if (confirmed) {
          const newTreatmentTotal = totalTreatmentHours - 2;
          const sessionsCount = currentTreatment.sessions || 1;
          const newHrsPerSess = newTreatmentTotal / sessionsCount;

          finalTasks[treatmentTaskIndex] = {
            ...currentTreatment,
            allocatedHours: newHrsPerSess,
          };

          finalTasks.push({
            taskId: dr001Task.id,
            allocatedHours: 2,
            sessions: 1,
            customRate: currentTreatment.customRate,
            displayHrs: '2',
            assignedUsers: [...currentTreatment.assignedUsers] 
          });
          
          dr001Added = true;
        }
      }
    }

    if (dr001Added) {
      setAllocatedTasks(finalTasks);
    }
    
    executeSavePayload(finalTasks);
  };

  const executeSavePayload = (tasksToSave: any[]) => {
    const totalAllocatedHours = tasksToSave.reduce((sum, task) => sum + (task.allocatedHours * task.sessions), 0);
    
    const calculatedTotalBudget = tasksToSave.reduce((sum, task) => {
      const activeRate = task.customRate !== null && task.customRate !== undefined ? task.customRate : masterProjectRate;
      return sum + (task.allocatedHours * task.sessions * activeRate);
    }, 0);
    
    const payload = {
      projectId,
      totalAllocatedHours,
      tasks: tasksToSave.map(t => ({ 
        taskId: t.taskId, 
        allocatedHours: t.allocatedHours * t.sessions,
        sessions: t.sessions,
        hoursPerSession: t.displayHrs !== undefined ? Number(t.displayHrs) : t.allocatedHours,
        assignedUsers: t.assignedUsers, 
        assignedUsersString: t.assignedUsers.join(',') 
      })),
      granularAssignments: tasksToSave.map(t => ({ taskId: t.taskId, users: t.assignedUsers })), 
      members: assignedMembers.map(userId => ({ userId, allocatedHours: 0 })) 
    };

    const activeRates = tasksToSave.map(t => t.customRate !== null && t.customRate !== undefined ? t.customRate : masterProjectRate);
    const maxRate = activeRates.length > 0 ? Math.max(...activeRates) : masterProjectRate;
    
    let scopeText = `\n--- Hourly Approved Rate @ $${maxRate.toFixed(2)} ---\n`;
    
    tasksToSave.forEach(taskAlloc => {
      const taskName = tasks.find((t: any) => t.id === taskAlloc.taskId)?.name || 'Unknown Task';
      
      if (taskName.toUpperCase().trim() === 'DR001') {
        return; 
      }

      const total = taskAlloc.allocatedHours * taskAlloc.sessions;
      const originalHrsPerSess = taskAlloc.displayHrs !== undefined ? Number(taskAlloc.displayHrs) : taskAlloc.allocatedHours;
      
      scopeText += `• ${taskName}: ${originalHrsPerSess.toFixed(2)} hrs/session x ${taskAlloc.sessions} sessions = ${total.toFixed(2)} hours\n`;
    });

    setIsSavingRates(true);

    allocateBudget(payload, { 
      onSuccess: async () => {
        try {
          const ratePayload = {
            rates: tasksToSave.map(t => ({
              taskId: t.taskId,
              customRate: t.customRate !== undefined && t.customRate !== null && String(t.customRate) !== '' ? Number(t.customRate) : null
            }))
          };
          await axiosInstance.put(`/projects/${projectId}/rates`, ratePayload);
          
          await Promise.all(tasksToSave.map(async (t) => {
             try {
                const firstUser = t.assignedUsers && t.assignedUsers.length > 0 ? t.assignedUsers[0] : null;
                await axiosInstance.put(`/tasks/${t.taskId}`, { 
                   assignedToId: firstUser,
                   assignedUsers: t.assignedUsers 
                });
             } catch (assignErr) {
                console.error("Direct Task Force Update Failed", assignErr);
             }
          }));

          try {
             await axiosInstance.post(`/projects/${projectId}/task-assignments`, {
                assignments: tasksToSave.map(t => ({
                   taskId: t.taskId,
                   userIds: t.assignedUsers
                }))
             });
          } catch (assignmentErr) {}

          try {
            const projRes = await axiosInstance.get(`/projects/${projectId}`);
            const projectData = projRes.data?.data?.project || projRes.data?.project;
            
            if (projectData) {
              const existingDesc = projectData.description || '';
              let cleanDesc = existingDesc.split('--- Hourly Approved Rate')[0].trim();
              cleanDesc = cleanDesc.split('--- HCAI APPROVED SCOPE ---')[0].trim();
              
              const newDesc = cleanDesc 
                ? cleanDesc + "\n" + scopeText.trim() 
                : scopeText.trim();
              
              await axiosInstance.patch(`/projects/${projectId}`, { 
                description: newDesc,
                budget: Number(calculatedTotalBudget.toFixed(2)) 
              });
            }
          } catch (scopeError) {
            console.error("Failed to append scope and budget to project description", scopeError);
          }

        } catch (error) {
          console.error("Failed to sync custom task rates", error);
        } finally {
          setIsSavingRates(false);
          onClose();
          window.location.reload(); 
        }
      },
      onError: () => {
        setIsSavingRates(false);
      }
    });
  };

  const unassignedTasks = tasks.filter((t: any) => !allocatedTasks.find(at => at.taskId === t.id));
  const isSavingTotal = isSaving || isSavingRates;

  const totalHours = allocatedTasks.reduce((sum, task) => sum + (task.allocatedHours * task.sessions), 0);
  const totalProjectedCost = allocatedTasks.reduce((sum, task) => {
    const activeRate = task.customRate !== null && task.customRate !== undefined ? task.customRate : masterProjectRate;
    return sum + (task.allocatedHours * task.sessions * activeRate);
  }, 0);

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 animate-in fade-in duration-250" style={{ backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)' }}>
      <div className="w-full max-w-[1100px] border shadow-2xl rounded-[20px] overflow-hidden flex flex-col max-h-[90vh]" style={{ backgroundColor: solidModalBg, borderColor: solidBorder }}>
        
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ backgroundColor: solidHeaderBg, borderColor: solidBorder }}>
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold" style={{ color: solidText }}>Allocate Shared Budget & Team</h2>
          </div>
          <button onClick={onClose} disabled={isSavingTotal} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8" style={{ backgroundColor: solidModalBg }}>
          {isLoadingUsers || isLoadingBudget ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading allocations...
            </div>
          ) : (
            <>
              {/* SECTION 1: Smart Matrix & Granular Assignments */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: solidText }}>1. Task Allocation & Assignment</h3>
                    <p className="text-xs text-muted-foreground mt-1">Set hours and assign specific users to each task. Users will only see tasks assigned to them.</p>
                  </div>
                  {masterProjectRate > 0 && (
                    <div className="text-xs bg-primary/10 text-primary border border-primary/20 px-3 py-1.5 rounded-md font-medium">
                      Master Rate: ${masterProjectRate.toFixed(2)}/h
                    </div>
                  )}
                </div>
                
                <div className="border rounded-[12px] p-4 space-y-3 overflow-x-auto min-h-[200px]" style={{ backgroundColor: solidHeaderBg, borderColor: solidBorder }}>
                  {allocatedTasks.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No tasks allocated yet.</p>
                  )}

                  {allocatedTasks.length > 0 && (
                    <div className="flex items-center gap-3 px-1 pb-2 border-b text-[11px] font-semibold text-muted-foreground uppercase tracking-wider min-w-[950px]" style={{ borderColor: solidBorder }}>
                      <div className="flex-grow">Task Name</div>
                      <div className="w-[180px]">Assigned To</div>
                      <div className="w-[85px] text-center">Hrs/Sess</div>
                      <div className="w-[10px] text-center"></div>
                      <div className="w-[85px] text-center">Sessions</div>
                      <div className="w-[10px] text-center"></div>
                      <div className="w-[75px] text-center">Total Hrs</div>
                      <div className="w-[10px] text-center"></div>
                      <div className="w-[90px] text-center">Rate ($)</div>
                      <div className="w-[10px] text-center"></div>
                      <div className="w-[85px] text-right">Budget</div>
                      <div className="w-[36px]"></div>
                    </div>
                  )}

                  {allocatedTasks.map((taskAlloc, taskIndex) => {
                    const rowTotalHours = taskAlloc.allocatedHours * taskAlloc.sessions;
                    const activeRowRate = taskAlloc.customRate !== null && taskAlloc.customRate !== undefined ? taskAlloc.customRate : masterProjectRate;
                    const rowTotalBudget = rowTotalHours * activeRowRate;
                    
                    const isDropdownOpen = taskDropdownOpen === taskAlloc.taskId;

                    return (
                      <div 
                        key={taskIndex} 
                        className="flex items-center gap-3 min-w-[950px]"
                      >
                        <div className="border text-sm rounded-lg px-3 py-2.5 flex-grow font-medium truncate" style={{ backgroundColor: solidModalBg, borderColor: solidBorder, color: solidText }}>
                          {tasks.find((t: any) => t.id === taskAlloc.taskId)?.name || 'Unknown Task'}
                        </div>
                        
                        <div className="relative shrink-0 w-[180px] user-assignment-dropdown">
                          <button 
                            onClick={() => setTaskDropdownOpen(isDropdownOpen ? null : taskAlloc.taskId)}
                            className="w-full border text-sm rounded-lg px-3 py-2.5 text-left flex justify-between items-center transition-all"
                            style={{ backgroundColor: solidModalBg, borderColor: solidBorder, color: solidText }}
                          >
                            <span className="truncate pr-2">
                              {taskAlloc.assignedUsers.length === 0 
                                ? <span className="text-muted-foreground italic">Unassigned</span>
                                : `${taskAlloc.assignedUsers.length} user${taskAlloc.assignedUsers.length > 1 ? 's' : ''}`}
                            </span>
                            <Users className="w-4 h-4 text-muted-foreground" />
                          </button>
                          
                          {isDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-[250px] border shadow-xl rounded-lg z-50 py-1 max-h-[200px] overflow-y-auto" style={{ backgroundColor: solidModalBg, borderColor: solidBorder }}>
                              <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-muted-foreground border-b mb-1" style={{ borderColor: solidBorder }}>Assign Users</div>
                              {users.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground">No users available</div>
                              ) : (
                                users.map((user: any) => (
                                  <label key={user.id} className="flex items-center gap-2 px-3 py-2 hover:bg-accent cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                                      checked={taskAlloc.assignedUsers.includes(user.id)}
                                      onChange={() => toggleTaskUser(taskIndex, user.id)}
                                    />
                                    <span className="text-sm truncate" style={{ color: solidText }}>
                                      {user.firstName} {user.lastName || ''}
                                    </span>
                                  </label>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="relative shrink-0 w-[85px]">
                          <input 
                            type="number" 
                            min="0"
                            step="any"
                            value={taskAlloc.displayHrs !== undefined ? taskAlloc.displayHrs : (taskAlloc.allocatedHours || '')}
                            onChange={(e) => updateTaskHours(taskIndex, e.target.value)}
                            className="w-full border text-sm rounded-lg px-2 py-2.5 text-center focus:ring-2 focus:ring-primary outline-none transition-all"
                            style={{ backgroundColor: solidModalBg, borderColor: solidBorder, color: solidText }}
                            placeholder="0"
                          />
                        </div>

                        <div className="text-muted-foreground text-sm font-bold shrink-0 w-[10px] text-center">×</div>

                        <div className="relative shrink-0 w-[85px]">
                          <input 
                            type="number" 
                            min="1"
                            value={taskAlloc.sessions || ''}
                            onChange={(e) => updateTaskSessions(taskIndex, Number(e.target.value))}
                            className="w-full border text-sm rounded-lg px-2 py-2.5 text-center focus:ring-2 focus:ring-primary outline-none transition-all"
                            style={{ backgroundColor: solidModalBg, borderColor: solidBorder, color: solidText }}
                            placeholder="1"
                          />
                        </div>

                        <div className="text-muted-foreground text-sm font-bold shrink-0 w-[10px] text-center">=</div>

                        <div className="w-[75px] shrink-0 text-center font-bold text-sm py-2.5 rounded-lg border" style={{ backgroundColor: solidModalBg, borderColor: solidBorder, color: solidText }}>
                          {rowTotalHours.toFixed(2)}h
                        </div>

                        <div className="text-muted-foreground text-sm font-bold shrink-0 w-[10px] text-center">×</div>

                        <div className="relative shrink-0 w-[90px]">
                          <input 
                            type="number" 
                            min="0"
                            step="any"
                            value={taskAlloc.customRate === null ? '' : taskAlloc.customRate}
                            onChange={(e) => updateTaskRate(taskIndex, e.target.value ? Number(e.target.value) : null)}
                            className="w-full border focus:border-primary text-sm rounded-lg pl-5 pr-1 py-2.5 text-right focus:ring-2 focus:ring-primary outline-none transition-all"
                            style={{ backgroundColor: solidModalBg, borderColor: solidBorder, color: solidText }}
                            placeholder="Def"
                          />
                          <span className="absolute left-2 top-2.5 text-xs text-primary font-bold">$</span>
                        </div>
                        
                        <div className="text-muted-foreground text-sm font-bold shrink-0 w-[10px] text-center">=</div>

                        <div className="w-[85px] shrink-0 text-right font-bold text-emerald-400 text-sm tracking-wide">
                          ${rowTotalBudget.toFixed(2)}
                        </div>

                        <button 
                          onClick={() => removeTask(taskIndex)}
                          className="w-[36px] p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0 flex justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}

                  {unassignedTasks.length > 0 && (
                    <div className="pt-2">
                      <select 
                        onChange={(e) => {
                          handleAddTask(e.target.value);
                          e.target.value = ''; 
                        }}
                        className="w-full border border-dashed border-primary/50 text-primary font-medium text-sm rounded-lg px-4 py-3 cursor-pointer hover:bg-primary/5 transition-colors appearance-none text-center"
                        style={{ backgroundColor: solidModalBg }}
                      >
                        <option value="" style={{ backgroundColor: solidModalBg, color: solidText }}>+ Add task to shared pool...</option>
                        {unassignedTasks.map((t: any) => (
                          <option key={t.id} value={t.id} style={{ backgroundColor: solidModalBg, color: solidText }}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 2: Project-Level Access */}
              <div className="space-y-4 pt-2 border-t" style={{ borderColor: solidBorder }}>
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: solidText }}>2. General Project Access</h3>
                  <p className="text-xs text-muted-foreground mt-1">Users selected here gain general access to the project. (Users assigned to specific tasks above are automatically included here).</p>
                </div>

                <div className="border rounded-[12px] p-4 grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[150px] overflow-y-auto" style={{ backgroundColor: solidHeaderBg, borderColor: solidBorder }}>
                  {users.map((user: any) => {
                    const isSelected = assignedMembers.includes(user.id);
                    const isRequiredByTask = allocatedTasks.some(t => t.assignedUsers.includes(user.id));
                    
                    return (
                      <label 
                        key={user.id} 
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-primary/10 border-primary shadow-sm' : ''} ${isRequiredByTask ? 'opacity-80' : ''}`}
                        style={!isSelected ? { backgroundColor: solidModalBg, borderColor: solidBorder } : undefined}
                      >
                        <div className={`w-4 h-4 rounded shrink-0 flex items-center justify-center border transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`} style={!isSelected ? { backgroundColor: solidModalBg } : undefined}>
                          {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <input 
                          type="checkbox" 
                          className="hidden" 
                          checked={isSelected}
                          disabled={isRequiredByTask}
                          onChange={() => !isRequiredByTask && toggleMember(user.id)}
                        />
                        <div className="flex flex-col truncate">
                          <span className={`text-xs font-semibold truncate ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`} style={isSelected ? { color: solidText } : undefined}>
                            {user.firstName} {user.lastName || ''}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t flex justify-between items-center shrink-0 overflow-x-auto" style={{ backgroundColor: solidHeaderBg, borderColor: solidBorder }}>
          <div className="flex items-center gap-6">
            <div className="text-sm text-muted-foreground font-medium whitespace-nowrap">
              Total Hours: <span className="text-base font-bold ml-1" style={{ color: solidText }}>{totalHours.toFixed(2)}h</span>
            </div>
            <div className="h-6 w-px" style={{ backgroundColor: solidBorder }}></div>
            <div className="text-sm text-muted-foreground font-medium whitespace-nowrap">
              Total Budget: <span className="text-emerald-400 text-[20px] font-bold ml-1">${totalProjectedCost.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="flex gap-3 ml-4">
            <button onClick={onClose} disabled={isSavingTotal} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button 
              type="button"
              onClick={handleSave}
              disabled={isSavingTotal || allocatedTasks.length === 0}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-[10px] bg-primary hover:bg-primary/95 text-sm font-semibold transition-all shadow-md disabled:opacity-50 disabled:shadow-none whitespace-nowrap ${isDark ? 'text-white' : 'text-slate-900 font-bold'}`}
            >
              {isSavingTotal ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save & Sync Plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
