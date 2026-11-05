'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, UploadCloud, AlertCircle, FileText, CheckSquare, Loader2, Clock, Calendar, DollarSign, Briefcase } from 'lucide-react';
import { useProjectBudget } from '@/features/projects/api/get-project-budget';
import { useLogTime } from '@/features/time/api/log-time';
import toast from 'react-hot-toast';
import { axiosInstance } from '@/lib/axios'; 
import RequestBudgetModal from './RequestBudgetModal';
import { useTheme } from 'next-themes';
import { useOrganization } from '@/features/organizations/api/get-organization'; // 🟢 NEW: Fetched for feature toggling

const EMPTY_TASKS: any[] = [];

interface LogTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
  tasks?: any[]; 
  editData?: any; 
}

export const LogTimeModal = ({ isOpen, onClose, defaultProjectId = '', tasks = EMPTY_TASKS, editData = null }: LogTimeModalProps) => {
  const [projectId, setProjectId] = useState(defaultProjectId);
  const { data: projectBudget, isLoading: isLoadingBudget } = useProjectBudget(projectId);
  const { mutateAsync: submitTimeEntry, isPending: isSubmitting } = useLogTime();

  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<any>(null);
  
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [cnrFile, setCnrFile] = useState<File | null>(null);
  const [attendanceFile, setAttendanceFile] = useState<File | null>(null);
  const [isAgreed, setIsAgreed] = useState(false);
  const [hours, setHours] = useState('');
  const [error, setError] = useState('');
  const [isBillable, setIsBillable] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false); 

  const [projects, setProjects] = useState<any[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [fetchedTasks, setFetchedTasks] = useState<any[]>([]);

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  const cnrInputRef = useRef<HTMLInputElement>(null);
  const attendanceInputRef = useRef<HTMLInputElement>(null);

  const { data: currentOrganization } = useOrganization(); // 🟢 NEW: Get current org context
  const isHealthcare = currentOrganization?.industryType === 'HEALTHCARE'; // 🟢 Feature Toggle Flag

  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  
  const solidModalBg = isDark ? '#0F172A' : '#ffffff';
  const solidInputBg = isDark ? '#1E293B' : '#F1F5F9';
  const solidText = isDark ? '#ffffff' : '#0F172A';
  const solidBorder = isDark ? '#334155' : '#e2e8f0';
  const solidHeaderBg = isDark ? '#1E293B' : '#F8FAFC';

  const optionStyle = { backgroundColor: isDark ? '#0F172A' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a' };
  const solidModalStyle = { backgroundColor: solidModalBg, border: `1px solid ${solidBorder}`, opacity: 1 };
  const solidHeaderStyle = { backgroundColor: solidHeaderBg, borderColor: solidBorder, opacity: 1 };
  const solidInputStyle = { backgroundColor: solidInputBg, color: solidText, border: `1px solid ${solidBorder}`, opacity: 1 };

  useEffect(() => {
    if (isOpen && !editData) {
      setIsLoadingProjects(true);
      axiosInstance.get('/projects')
        .then(res => {
          let pData = res.data?.data?.projects || res.data?.projects || res.data?.data || res.data || [];
          setProjects(Array.isArray(pData) ? pData : []);
        })
        .catch(err => console.error("Projects fetch error", err))
        .finally(() => setIsLoadingProjects(false));
    }
  }, [isOpen, editData]);

  useEffect(() => {
    if (isOpen && projectId) {
      axiosInstance.get(`/tasks?projectId=${projectId}`)
        .then(res => {
           let tData = res.data;
           let extractedTasks = [];
           if (Array.isArray(tData)) extractedTasks = tData;
           else if (Array.isArray(tData?.data)) extractedTasks = tData.data;
           else if (Array.isArray(tData?.tasks)) extractedTasks = tData.tasks;
           else if (Array.isArray(tData?.data?.tasks)) extractedTasks = tData.data.tasks;
           
           setFetchedTasks(extractedTasks);
        })
        .catch(err => {
           console.error("Failed to fetch task list for modal:", err);
           setFetchedTasks([]);
        });
    } else {
      setFetchedTasks([]);
    }
  }, [projectId, isOpen]);

  const availableTasks = React.useMemo(() => {
    const allTasks: any[] = [];
    const allTaskBudgets = projectBudget?.data?.taskBudgets || projectBudget?.taskBudgets || projectBudget?.data?.data?.taskBudgets || [];
    
    let sourceTasks = [...(tasks || []), ...(fetchedTasks || [])];

    if (!sourceTasks || sourceTasks.length === 0) {
       sourceTasks = allTaskBudgets.map((tb: any) => tb.task).filter(Boolean);
    }

    if (sourceTasks && sourceTasks.length > 0) {
      const uniqueTasks = Array.from(new Map(sourceTasks.map((t:any) => [t.id, t])).values());

      uniqueTasks.forEach((t: any) => {
        if (!t || (!t.id && !t.taskId)) return;

        const tb = allTaskBudgets.find((b: any) => b.taskId === (t.id || t.taskId));
        const allocated = tb ? Number(tb.allocatedHours || 0) : 0;
        const consumed = tb ? Number(tb.consumedHours || 0) : 0;
        const dbRemaining = tb ? Number(tb.remainingHours || 0) : 0;
        const actualRemaining = (dbRemaining === 0 && allocated > 0) ? Math.max(0, allocated - consumed) : dbRemaining;
        const isClinical = t.requiresClinicalCompliance === true || String(t.requiresClinicalCompliance).toLowerCase() === 'true' || tb?.requiresClinicalCompliance === true || String(tb?.requiresClinicalCompliance).toLowerCase() === 'true' || tb?.task?.requiresClinicalCompliance === true || String(tb?.task?.requiresClinicalCompliance).toLowerCase() === 'true';

        allTasks.push({
          id: tb ? tb.id : `unallocated-${t.id || t.taskId}`,
          taskBudgetId: tb ? tb.id : null,
          taskId: t.id || t.taskId,
          name: t.name || 'Unnamed Task',
          requiresClinicalCompliance: isClinical,
          isBillableByDefault: t.isBillable === true || String(t.isBillable).toLowerCase() === 'true',
          sessionLimitHours: tb ? Number(tb.sessionLimitHours || 0) : Number(t.defaultSessionLimitHours || 0),
          remainingHours: actualRemaining,
          allocatedHours: allocated,
          consumedHours: consumed,
          isAllocated: !!tb 
        });
      });
    }

    if (editData && (editData.taskId || editData.task?.id)) {
      const tId = editData.taskId || editData.task?.id;
      const exists = allTasks.find(t => t.taskId === tId);
      
      if (!exists) {
        const tName = editData.task?.name || 'Assigned Task';
        const tb = allTaskBudgets.find((b: any) => b.taskId === tId);
        allTasks.push({
          id: tb ? tb.id : `fallback-${tId}`,
          taskBudgetId: tb ? tb.id : null,
          taskId: tId,
          name: tName,
          requiresClinicalCompliance: false,
          isBillableByDefault: editData.isBillable ?? true,
          sessionLimitHours: tb ? Number(tb.sessionLimitHours || 0) : 0,
          remainingHours: tb ? Number(tb.remainingHours || 0) : 0,
          allocatedHours: tb ? Number(tb.allocatedHours || 0) : 0,
          consumedHours: tb ? Number(tb.consumedHours || 0) : 0,
          isAllocated: !!tb
        });
      }
    }

    return allTasks;
  }, [projectBudget, tasks, fetchedTasks, editData]);

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setProjectId(editData.projectId || editData.project?.id || defaultProjectId);
        setSelectedTaskId(editData.taskId || editData.task?.id || '');
        setHours(String(editData.duration || ''));
        setNotes(editData.description || '');
        setDate(editData.date ? new Date(editData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        setIsBillable(editData.isBillable ?? true);
        setCnrFile(null);
        setAttendanceFile(null);
        setIsAgreed(true); 
      } else {
        setProjectId(defaultProjectId);
        if (!date) setDate(new Date().toISOString().split('T')[0]);
        setSelectedTaskId('');
        setHours('');
        setNotes('');
        setCnrFile(null);
        setAttendanceFile(null);
        setIsAgreed(false);
      }
      setError('');
    }
  }, [isOpen, editData, defaultProjectId]);

  useEffect(() => {
    if (isOpen && editData && availableTasks.length > 0) {
      const tid = editData.taskId || editData.task?.id;
      if (tid && selectedTaskId !== tid) {
        setSelectedTaskId(tid);
      }
    }
  }, [isOpen, editData, availableTasks, selectedTaskId]);

  useEffect(() => {
    if (selectedTaskId) {
      const task = availableTasks.find(t => t.id === selectedTaskId || t.taskId === selectedTaskId || t.taskBudgetId === selectedTaskId);
      setSelectedTaskDetails(task || null);
      
      if (!editData) {
        setIsBillable(task ? task.isBillableByDefault : true);
      }
    } else {
      setSelectedTaskDetails(null);
    }
  }, [selectedTaskId, availableTasks, editData]);

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHours(val);
    
    const isOverBudgetAllowed = projectBudget?.allowOverBudget === true;
    const durNum = Number(val) || 0;
    
    if (selectedTaskDetails?.sessionLimitHours && durNum > selectedTaskDetails.sessionLimitHours) {
      setError(`Entry cannot exceed the allotted ${selectedTaskDetails.sessionLimitHours} hours per session.`);
    } 
    else if (!isOverBudgetAllowed && selectedTaskDetails && selectedTaskDetails.isAllocated && durNum > selectedTaskDetails.remainingHours && !editData) {
       setError(`Cannot exceed remaining task budget (${selectedTaskDetails.remainingHours.toFixed(2)}h). Project restricts over-budget logging.`);
    } 
    else {
      setError('');
    }
  };

  const handleClose = () => {
    setSelectedTaskId('');
    setNotes('');
    setCnrFile(null);
    setAttendanceFile(null);
    setIsAgreed(false);
    setHours('');
    setError('');
    setProjectId(defaultProjectId);
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedTaskId || !hours || Number(hours) <= 0 || error) return;
    
    if (selectedTaskDetails?.requiresClinicalCompliance && !editData) {
      if (!cnrFile || !attendanceFile) {
        setError('Please upload both Clinical Notes and Attendance Sheet.');
        return;
      }
      if (!isAgreed) {
        setError('You must check the declaration box before submitting.');
        return;
      }
    }

    try {
      setIsUpdating(true);
      const actualTaskId = selectedTaskDetails?.taskId || selectedTaskId;
      
      if (editData && editData.id) {
        const payload: any = {
          projectId,
          taskId: actualTaskId,
          taskBudgetId: selectedTaskDetails?.taskBudgetId || undefined,
          duration: Number(hours),
          date: new Date(date).toISOString(),
          description: notes,
          isBillable: isBillable
        };

        // 🟢 THE FIX FOR DRAFT ENTRIES NOT SUBMITTING
        const currentStatus = String(editData.approvalStatus || editData.status || '').toUpperCase();
        if (currentStatus === 'DRAFT') {
            payload.status = 'PENDING';
            payload.approvalStatus = 'PENDING';
        }

        await axiosInstance.patch(`/time-entries/${editData.id}`, payload);
        toast.success(currentStatus === 'DRAFT' ? 'Time entry submitted successfully!' : 'Time entry updated successfully!');
      } else {
        const formData = new FormData();
        formData.append('projectId', projectId);
        formData.append('taskId', actualTaskId);
        if (selectedTaskDetails?.taskBudgetId) formData.append('taskBudgetId', selectedTaskDetails.taskBudgetId);
        formData.append('duration', hours);
        formData.append('date', new Date(date).toISOString());
        formData.append('description', notes);
        formData.append('isBillable', String(isBillable));
        if (cnrFile) formData.append('cnrDocument', cnrFile);
        if (attendanceFile) formData.append('attendanceDocument', attendanceFile);

        await submitTimeEntry(formData);
        toast.success('Time entry logged successfully!');
      }
      
      handleClose();
      if (typeof window !== 'undefined') {
         setTimeout(() => window.location.assign('/dashboard'), 1000); 
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to log time. Please try again.';
      setError(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  const isClinical = selectedTaskDetails?.requiresClinicalCompliance === true;
  const isUploadComplete = cnrFile && attendanceFile;
  const isTimeInputLocked = isClinical && !editData && (!isUploadComplete || !isAgreed);
  const loadingState = isSubmitting || isUpdating || isLoadingProjects;
  
  const isSubmitDisabled = !selectedTaskId || !hours || Number(hours) <= 0 || !!error || isTimeInputLocked || loadingState || notes.trim() === '';

  const durNum = parseFloat(hours) || 0;
  const usagePercent = (selectedTaskDetails && selectedTaskDetails.allocatedHours > 0)
    ? ((selectedTaskDetails.consumedHours + durNum) / selectedTaskDetails.allocatedHours) * 100 
    : 0;

  let warningMessage = '';
  if (selectedTaskDetails?.isAllocated && durNum > 0 && selectedTaskDetails.allocatedHours > 0) {
    const prevUsage = (selectedTaskDetails.consumedHours / selectedTaskDetails.allocatedHours) * 100;
    
    if (usagePercent > 100) {
      warningMessage = '🚨 WARNING: This entry exceeds 100% of the allocated budget!';
    } else if (usagePercent >= 90 && prevUsage < 90) {
      warningMessage = '⚠️ WARNING: This entry takes this task above 90% of its allocated budget!';
    } else if (usagePercent >= 75 && prevUsage < 75) {
      warningMessage = 'ℹ️ Note: This entry takes this task above 75% of its allocated budget.';
    } else if (usagePercent >= 50 && prevUsage < 50) {
      warningMessage = 'ℹ️ Note: This task will now consume 50% of its budget.';
    }
  }

  const mappedTasksForBudget = availableTasks.map(t => ({
    id: t.taskId,
    name: t.name
  }));

  return (
    <>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <div 
          className="rounded-[20px] w-full max-w-[500px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] overflow-hidden"
          style={solidModalStyle}
        >
          
          <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 rounded-t-[20px]" style={solidHeaderStyle}>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#3B82F6]" />
              <h2 className="text-lg font-bold" style={{ color: solidText }}>{editData ? 'Edit Time Entry' : 'Log Time'}</h2>
            </div>
            <button 
              onClick={handleClose} 
              disabled={loadingState}
              className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
              style={{ color: isDark ? '#94A3B8' : '#64748B' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar relative" style={solidModalStyle}>
            {isLoadingBudget ? (
              <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" /></div>
            ) : (
              <>
                {!editData && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                      Select {isHealthcare ? 'Case / Patient' : 'Project'} <span className="text-[#EF4444]">*</span>
                    </label>
                    <select 
                      className="w-full h-[44px] px-3 rounded-[12px] text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] transition-all cursor-pointer disabled:opacity-50 appearance-none"
                      value={projectId}
                      onChange={(e) => {
                        setProjectId(e.target.value);
                        setSelectedTaskId('');
                      }}
                      disabled={loadingState}
                      style={solidInputStyle}
                    >
                      <option value="" style={optionStyle}>-- Choose a {isHealthcare ? 'case' : 'project'} --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id} style={optionStyle}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Select Task <span className="text-[#EF4444]">*</span></label>
                  <select 
                    className="w-full h-[44px] px-3 rounded-[12px] text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] transition-all cursor-pointer disabled:opacity-50 appearance-none"
                    value={selectedTaskId || ''}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    disabled={loadingState || !!editData || !projectId} 
                    style={solidInputStyle}
                  >
                    <option value="" style={optionStyle}>-- Choose a task --</option>
                    {availableTasks.map((task) => {
                      const valToUse = task.taskId || task.id;
                      return (
                        <option key={task.id || Math.random()} value={valToUse} style={optionStyle}>
                          {task.name} {!task.isAllocated ? '(Unallocated)' : ''} {task.requiresClinicalCompliance ? '(Clinical)' : ''} 
                        </option>
                      )
                    })}
                  </select>
                </div>

                {selectedTaskId && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center justify-between" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> {isHealthcare ? 'Notes / Tx Session Details' : 'Notes / Description'} <span className="text-[#EF4444]">*</span>
                      </span>
                    </label>
                    <textarea 
                      className="w-full p-3 rounded-[12px] text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] transition-all disabled:opacity-50 resize-none min-h-[80px]"
                      placeholder={isHealthcare ? "Enter detailed session notes (Required)..." : "Enter detailed task notes (Required)..."}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={loadingState}
                      style={{ ...solidInputStyle, borderColor: notes.trim() === '' ? '#EF4444' : solidBorder }}
                    />
                    {notes.trim() === '' && (
                      <p className="text-[11px] text-[#EF4444] font-medium">Notes are mandatory to log time.</p>
                    )}
                  </div>
                )}

                {isClinical && !editData && (
                  <div className="rounded-[12px] p-4 space-y-4" style={{ backgroundColor: solidInputBg, border: `1px solid ${isDark ? '#3B82F630' : '#E2E8F0'}` }}>
                    <div className="flex items-center gap-2 text-[#3B82F6] mb-2 border-b pb-3" style={{ borderColor: solidBorder }}>
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-bold">Clinical Compliance Required</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 w-full">
                      <div 
                        onClick={() => !loadingState && cnrInputRef.current?.click()}
                        className={`border border-dashed rounded-[10px] p-4 flex flex-col items-center justify-center text-center transition-colors cursor-pointer w-full ${loadingState ? 'opacity-50' : ''}`}
                        style={{ backgroundColor: cnrFile ? (isDark ? '#22C55E20' : '#DCFCE7') : solidModalBg, borderColor: cnrFile ? '#22C55E' : solidBorder, color: cnrFile ? '#22C55E' : (isDark ? '#94A3B8' : '#64748B') }}
                      >
                        <input type="file" ref={cnrInputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setCnrFile(e.target.files?.[0] || null)} disabled={loadingState}/>
                        <FileText className="w-6 h-6 mb-2 shrink-0" />
                        <span className="text-xs font-semibold block w-full truncate px-1">
                          {cnrFile ? cnrFile.name : 'Upload CNR'}
                        </span>
                      </div>

                      <div 
                        onClick={() => !loadingState && attendanceInputRef.current?.click()}
                        className={`border border-dashed rounded-[10px] p-4 flex flex-col items-center justify-center text-center transition-colors cursor-pointer w-full ${loadingState ? 'opacity-50' : ''}`}
                        style={{ backgroundColor: attendanceFile ? (isDark ? '#22C55E20' : '#DCFCE7') : solidModalBg, borderColor: attendanceFile ? '#22C55E' : solidBorder, color: attendanceFile ? '#22C55E' : (isDark ? '#94A3B8' : '#64748B') }}
                      >
                        <input type="file" ref={attendanceInputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setAttendanceFile(e.target.files?.[0] || null)} disabled={loadingState}/>
                        <UploadCloud className="w-6 h-6 mb-2 shrink-0" />
                        <span className="text-xs font-semibold block w-full truncate px-1">
                          {attendanceFile ? attendanceFile.name : 'Upload Attendance'}
                        </span>
                      </div>
                    </div>

                    {isUploadComplete && (
                      <label className={`flex items-start gap-3 mt-4 cursor-pointer ${loadingState ? 'opacity-50' : ''}`}>
                        <div className="mt-0.5">
                          <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={isAgreed}
                            onChange={(e) => setIsAgreed(e.target.checked)}
                            disabled={loadingState}
                          />
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors`} style={{ backgroundColor: isAgreed ? '#3B82F6' : 'transparent', borderColor: isAgreed ? '#3B82F6' : solidBorder }}>
                            <CheckSquare className="w-4 h-4 text-white" />
                          </div>
                        </div>
                        <span className="text-xs leading-relaxed" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                          I confirm that I have conducted this session and uploaded the valid Attendance Sheet & Clinical Notes (CNR).
                        </span>
                      </label>
                    )}
                  </div>
                )}

                {selectedTaskId && (
                  <div className={`grid grid-cols-2 gap-4 transition-opacity ${isTimeInputLocked ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium flex items-center justify-between" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> Hours <span className="text-[#EF4444]">*</span>
                        </span>
                      </label>
                      <input 
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={hours}
                        onChange={handleHoursChange}
                        placeholder="e.g. 2.0" 
                        disabled={isTimeInputLocked || loadingState}
                        className="w-full h-[44px] px-3 rounded-[12px] text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] transition-all disabled:opacity-50"
                        style={{ ...solidInputStyle, borderColor: error ? '#EF4444' : solidBorder }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium flex items-center gap-1.5" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                        <Calendar className="w-3.5 h-3.5" /> Date <span className="text-[#EF4444]">*</span>
                      </label>
                      <input 
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        disabled={isTimeInputLocked || loadingState}
                        className="w-full h-[44px] px-3 rounded-[12px] text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] transition-all disabled:opacity-50"
                        style={solidInputStyle}
                      />
                    </div>
                  </div>
                )}
                
                {error && (
                  <div className="flex flex-col gap-3 relative z-[50]">
                    <div className="flex items-start gap-2 text-sm p-3 rounded-lg shadow-sm" style={{ backgroundColor: isDark ? '#450a0a' : '#fef2f2', color: '#EF4444', border: '1px solid #f87171' }}>
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p className="font-semibold leading-tight">{error}</p>
                    </div>
                    
                    {error.toLowerCase().includes('budget') && (
                      <button 
                        type="button"
                        onClick={(e) => { e.preventDefault(); setIsBudgetModalOpen(true); }}
                        onTouchEnd={(e) => { e.preventDefault(); setIsBudgetModalOpen(true); }}
                        className="flex items-center justify-center w-full gap-2 py-3 rounded-[10px] text-sm font-bold transition-all shadow-md cursor-pointer relative z-[99999]"
                        style={{ backgroundColor: isDark ? '#422006' : '#fffbeb', color: '#F59E0B', border: '1px solid #fcd34d' }}
                      >
                        Request Extra Budget
                      </button>
                    )}
                  </div>
                )}

                {selectedTaskDetails?.isAllocated && !isTimeInputLocked && !editData && (
                  <div className="p-4 rounded-[12px] space-y-3" style={{ backgroundColor: solidHeaderBg, border: `1px solid ${solidBorder}` }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium" style={{ color: solidText }}>
                        <Briefcase className="w-4 h-4 text-[#3B82F6]" />
                        Task Budget Status
                      </div>
                      {selectedTaskDetails.sessionLimitHours > 0 && (
                         <span className="text-[10px] px-2 py-1 rounded" style={{ backgroundColor: solidModalBg, color: isDark ? '#94A3B8' : '#64748B', border: `1px solid ${solidBorder}` }}>
                           Max {selectedTaskDetails.sessionLimitHours}h / session
                         </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: solidModalBg, border: `1px solid ${solidBorder}` }}>
                        <p className="text-xs mb-0.5" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Allocated</p>
                        <p className="text-sm font-semibold" style={{ color: solidText }}>{selectedTaskDetails.allocatedHours.toFixed(2)}h</p>
                      </div>
                      <div className="p-2 rounded-lg" style={{ backgroundColor: solidModalBg, border: `1px solid ${solidBorder}` }}>
                        <p className="text-xs mb-0.5" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Remaining</p>
                        <p className={`text-sm font-semibold ${Math.max(0, selectedTaskDetails.remainingHours - durNum) <= 0 && !projectBudget?.allowOverBudget ? 'text-[#EF4444]' : 'text-[#22C55E]'}`}>
                          {(selectedTaskDetails.remainingHours - durNum).toFixed(2)}h
                        </p>
                      </div>
                      <div className="p-2 rounded-lg" style={{ backgroundColor: solidModalBg, border: `1px solid ${solidBorder}` }}>
                        <p className="text-xs mb-0.5" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>Usage</p>
                        <p className="text-sm font-semibold" style={{ color: solidText }}>
                          {selectedTaskDetails.allocatedHours > 0 ? usagePercent.toFixed(1) : '0.0'}%
                        </p>
                      </div>
                    </div>

                    {warningMessage && !error && (
                      <div className="flex items-start gap-2 text-sm p-3 rounded-lg shadow-sm mt-2" style={{ 
                        backgroundColor: usagePercent >= 90 ? (isDark ? '#450a0a' : '#fef2f2') : (isDark ? '#422006' : '#fffbeb'), 
                        color: usagePercent >= 90 ? '#EF4444' : '#F59E0B', 
                        border: `1px solid ${usagePercent >= 90 ? '#f87171' : '#fcd34d'}` 
                      }}>
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p className="font-semibold leading-tight">{warningMessage}</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedTaskId && (
                  <label 
                    className={`flex items-center gap-3 p-3 rounded-[12px] transition-colors cursor-pointer ${isTimeInputLocked || loadingState ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ backgroundColor: solidHeaderBg, border: `1px solid ${solidBorder}` }}
                  >
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        checked={isBillable}
                        onChange={(e) => setIsBillable(e.target.checked)}
                        disabled={isTimeInputLocked || loadingState}
                        className="sr-only peer"
                      />
                      <div className={`w-10 h-5 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all`} style={{ backgroundColor: isBillable ? '#3B82F6' : (isDark ? '#334155' : '#cbd5e1') }}></div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className={`w-4 h-4 ${isBillable ? 'text-[#22C55E]' : ''}`} style={{ color: !isBillable ? (isDark ? '#94A3B8' : '#64748B') : undefined }} />
                      <span className="text-sm font-medium" style={{ color: solidText }}>Billable Time</span>
                    </div>
                  </label>
                )}
              </>
            )}
          </div>

          <div className="px-6 py-4 border-t flex justify-end gap-3 shrink-0 rounded-b-[20px] relative z-20" style={{ borderColor: solidBorder, backgroundColor: solidHeaderBg }}>
            <button 
              type="button"
              onClick={handleClose}
              disabled={loadingState}
              className="px-4 py-2 h-[44px] rounded-[12px] text-sm font-medium transition-colors disabled:opacity-50"
              style={{ color: isDark ? '#94A3B8' : '#64748B' }}
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className="flex items-center gap-2 px-5 py-2 h-[44px] rounded-[12px] bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-semibold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingState ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                 editData ? 'Update Entry' : 'Save Entry'
              )}
            </button>
          </div>

        </div>
      </div>

      <RequestBudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        projectId={projectId}
        tasks={mappedTasksForBudget}
        onSuccess={() => {
          setIsBudgetModalOpen(false);
          handleClose();
        }}
      />
    </>
  );
};
