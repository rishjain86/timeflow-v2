'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Building2, 
  Calendar, 
  Clock, 
  Edit, 
  FileText, 
  Users,
  Loader2,
  Briefcase,
  DollarSign,
  CheckCircle2,
  Plus,
  MoreVertical,
  Trash2,
  Lock
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes'; 
import { useQuery } from '@tanstack/react-query'; 
import { useProject } from '@/features/projects/api/get-project';
import { useProjectBudget } from '@/features/projects/api/get-project-budget';
import { useTasks } from '@/features/tasks/api/get-tasks';
import { useTimeEntries } from '@/features/time/api/get-time-entries';
import { LogTimeModal } from '@/components/time/LogTimeModal';
import { NewTaskModal } from '@/components/tasks/NewTaskModal';
import { EditTaskModal } from '@/components/tasks/EditTaskModal'; 
import { AllocateBudgetModal } from '@/components/projects/AllocateBudgetModal';
import { useOrganization } from '@/features/organizations/api/get-organization'; // 🟢 NEW: Fetched for feature toggling
import toast from 'react-hot-toast';
import { axiosInstance } from '@/lib/axios';

const getSafeArray = (data: any) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (data.data && Array.isArray(data.data.timeEntries)) return data.data.timeEntries;
  if (data.timeEntries && Array.isArray(data.timeEntries)) return data.timeEntries;
  return [];
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [isLogTimeOpen, setIsLogTimeOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isAllocateOpen, setIsAllocateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null); 

  const { data: currentOrganization } = useOrganization(); // 🟢 NEW: Get current org context
  const isHealthcare = currentOrganization?.industryType === 'HEALTHCARE'; // 🟢 NEW: Feature Toggle Flag

  const { data: currentUser } = useQuery({
    queryKey: ['current-auth-user'],
    queryFn: async () => {
      try {
        const response = await axiosInstance.get('/auth/me');
        return response.data?.data?.user || response.data?.user || response.data || null;
      } catch (error) {
        return null;
      }
    }
  });

  const isAdminOrManager = currentUser ? ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(currentUser.role) : false;

  const { data: project, isLoading, isError } = useProject(id);
  const { data: projectBudget, isLoading: isLoadingBudget } = useProjectBudget(project?.id || id);
  const { data: allTasks = [], isLoading: isLoadingTasks } = useTasks({ projectId: project?.id || id });
   
  const { data: timeEntriesData } = useTimeEntries({ 
    projectId: project?.id ? project.id : undefined, 
    limit: 100 
  });
   
  const projectTimeEntries = getSafeArray(timeEntriesData);
  const totalBilledAmount = projectTimeEntries.reduce((sum: number, t: any) => sum + Number(t.billableAmount || 0), 0);

  // 🟢 DASHBOARD WALA FUNDA YAHAN ADD KIYA HAI
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const solidMenuBg = isDark ? '#1E293B' : '#ffffff'; 
  const solidText = isDark ? '#ffffff' : '#0F172A';

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading {isHealthcare ? 'case' : 'project'} details...</p>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="text-destructive font-bold text-xl">{isHealthcare ? 'Case' : 'Project'} not found</div>
        <p className="text-muted-foreground">The {isHealthcare ? 'case' : 'project'} you are looking for doesn't exist or has been deleted.</p>
        <Link href="/projects" className="btn-secondary px-4 py-2 mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to {isHealthcare ? 'Cases' : 'Projects'}
        </Link>
      </div>
    );
  }

  const isArchived = Boolean(project.isArchived); 
  const clientName = typeof project.client === 'object' ? project.client?.name : (project.client || 'Unknown Client');
  const progress = Number(projectBudget?.progressPercentage || 0); 
  const totalAllocatedNum = Number(projectBudget?.totalAllocatedHours || 0);
  const consumedHoursNum = Number(projectBudget?.consumedHours || 0);
  const totalAllocated = `${totalAllocatedNum.toFixed(2)}h`;
  const trackedHours = `${consumedHoursNum.toFixed(2)}h / ${totalAllocatedNum.toFixed(2)}h`;
  const budgetStatus = projectBudget?.status || 'NOT SET';
  const startDate = project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A';
  const dateVal = project.deadline || project.endDate;
  const dueDate = dateVal ? new Date(dateVal).toLocaleDateString() : 'No deadline';
  const description = project.description || `No description provided for this ${isHealthcare ? 'case' : 'project'}.`;

  const getStatusColor = (status: string) => {
    const currentStatus = status?.toUpperCase() || '';
    switch(currentStatus) {
      case 'HEALTHY': 
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-sm';
      case 'WARNING': 
      case 'NEAR_EXHAUSTION': 
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-sm';
      case 'EXHAUSTED': 
      case 'OVER_BUDGET': 
      case 'OVER BUDGET':
        return 'text-rose-500 bg-rose-500/10 border-rose-500/20 shadow-sm';
      default: 
        return 'text-muted-foreground bg-background border-border';
    }
  };

  const getProgressColor = (status: string, percent: number = 0) => {
    if (percent >= 90) return 'bg-destructive shadow-md';
    if (percent >= 75) return 'bg-warning shadow-md';
    return 'bg-primary shadow-md';
  };

  const handleDeleteTask = async (taskId: string, taskName: string) => {
    if(window.confirm(`Are you sure you want to permanently delete the task "${taskName}"? This cannot be undone.`)) {
      try {
        await axiosInstance.delete(`/tasks/${taskId}`);
        toast.success(`Task "${taskName}" deleted successfully`);
        router.refresh(); 
        setTimeout(() => window.location.reload(), 100); 
      } catch (error) {
        toast.error('Failed to delete task. Make sure it has no dependent time entries.');
      }
    }
  };

  const visibleTasks = allTasks.filter((t: any) => {
    if (isAdminOrManager) return true; 
    if (!currentUser) return false;

    if (t.assignments === undefined) {
       return projectBudget?.memberBudgets?.some((mb: any) => mb.userId === currentUser.id);
    }
    
    const isLegacyAssigned = t.assignedToId === currentUser.id;
    const isGranularlyAssigned = Array.isArray(t.assignments) && t.assignments.some((a: any) => a.userId === currentUser.id);
    
    return isLegacyAssigned || isGranularlyAssigned;
  });

  const taskBudgets = projectBudget?.taskBudgets || [];
  const allocatedTaskIds = new Set(taskBudgets.map((tb: any) => tb.taskId));

  const budgetedTasks = visibleTasks.filter((t: any) => allocatedTaskIds.has(t.id)).map((t: any) => {
    const budgetInfo = taskBudgets.find((tb: any) => tb.taskId === t.id);
    return { ...t, budgetInfo };
  });

  const unbudgetedTasks = visibleTasks.filter((t: any) => !allocatedTaskIds.has(t.id));

  const getAssignedNames = (task: any) => {
    let names: string[] = [];
    
    if (task.assignments && Array.isArray(task.assignments) && task.assignments.length > 0) {
      names = task.assignments.map((a: any) => {
        const u = a.user || a;
        return u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : null;
      }).filter(Boolean);
    } 
    
    if (names.length === 0 && task.assignedTo) {
      names = [`${task.assignedTo.firstName} ${task.assignedTo.lastName || ''}`.trim()];
    }

    if (names.length > 0) {
      return Array.from(new Set(names)).join(', ');
    }
    
    return 'Unassigned';
  };

  return (
    <div className="timeflow-container py-6 px-4 sm:px-6 space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link 
          href="/projects" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer relative z-10"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to {isHealthcare ? 'Cases' : 'Projects'}</span>
        </Link>
        <div className="flex items-center gap-3 w-full sm:w-auto relative z-10">
          <button 
            onClick={() => router.push(`/projects/${project.slug || project.id}/edit`)} 
            disabled={isArchived}
            className={`btn-secondary h-[40px] px-4 text-xs ${isArchived ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Edit className="w-3.5 h-3.5 mr-2" /> Edit {isHealthcare ? 'Case' : 'Project'}
          </button>
          <button 
            onClick={() => setIsLogTimeOpen(true)}
            disabled={isArchived || visibleTasks.length === 0} 
            className={`btn-primary h-[40px] px-4 text-xs ${isArchived || visibleTasks.length === 0 ? 'opacity-50 cursor-not-allowed shadow-none' : ''}`}
          >
            + Log Time
          </button>
        </div>
      </div>

      <div className={`bg-card border border-border rounded-[16px] p-5 sm:p-6 shadow-xl space-y-6 ${isArchived ? 'opacity-90' : ''}`}>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{project.name}</h1>
              {isArchived ? (
                <span className="badge-base bg-warning/20 text-warning border border-warning/30 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Archived (Read-Only)
                </span>
              ) : (
                <span className="badge-base badge-paid">
                  {project.status || 'Active'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1.5">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-foreground font-medium">{clientName}</span>
            </div>
             
            {projectBudget?.memberBudgets && projectBudget.memberBudgets.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1.5">
                <Users className="w-4 h-4 text-info" />
                <span className="text-info font-medium">
                  Assigned: {projectBudget.memberBudgets.map((m: any) => `${m.user?.firstName} ${m.user?.lastName}`).join(', ')}
                </span>
              </div>
            )}

          </div>

          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <div className="flex-1 lg:flex-none text-right bg-background p-3 rounded-[10px] border border-border min-w-[120px]">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold flex justify-end items-center gap-1">
                <DollarSign className="w-3 h-3" /> Budget
              </p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                {project.budget ? `$${project.budget.toLocaleString()}` : 'Not set'}
              </p>
            </div>

            <div className="flex-1 lg:flex-none text-right bg-background p-3 rounded-[10px] border border-border min-w-[120px]">
               <p className="text-[11px] text-success uppercase tracking-wider font-semibold">Total Billed</p>
               <p className="text-lg font-bold text-success mt-0.5">${totalBilledAmount.toFixed(2)}</p>
            </div>

            <div className={`flex-1 lg:flex-none text-right p-3 rounded-[10px] border min-w-[120px] ${getStatusColor(budgetStatus)}`}>
              <p className="text-[11px] uppercase tracking-wider font-semibold opacity-80">Hours Status</p>
              <p className="text-xs sm:text-sm font-black mt-0.5">{budgetStatus.replace('_', ' ')}</p>
            </div>

            <div 
              onClick={() => router.push(`/reports?projectId=${project.id}`)}
              className="flex-1 lg:flex-none text-right bg-background p-3 rounded-[10px] border border-border min-w-[130px] cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-all group"
              title="View detailed project report"
            >
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold group-hover:text-primary transition-colors">Hours Used</p>
              <p className="text-base sm:text-lg font-bold text-foreground mt-0.5 group-hover:text-primary transition-colors">{trackedHours}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground font-semibold">Overall Hours Consumption</span>
            <span className="font-bold text-foreground">{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full h-2.5 bg-background border border-border rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(budgetStatus, progress)}`} 
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-primary/10 border border-primary/20 rounded-[8px] flex items-center justify-center text-info">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Allocated Hours</p>
              <p className="text-xs sm:text-sm font-bold text-foreground mt-0.5">{totalAllocated}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-success/10 border border-success/20 rounded-[8px] flex items-center justify-center text-success">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Start Date</p>
              <p className="text-xs sm:text-sm font-bold text-foreground mt-0.5">{startDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-info/10 border border-info/20 rounded-[8px] flex items-center justify-center text-info">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Target Deadline</p>
              <p className="text-xs sm:text-sm font-bold text-foreground mt-0.5">{dueDate}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 space-y-6">

          <div className="bg-card border border-border rounded-[16px] p-5 shadow-md">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" /> Budgeted Tasks
              </h2>
              {isAdminOrManager && (
                <button 
                  onClick={() => setIsAllocateOpen(true)} 
                  disabled={isArchived}
                  className={`btn-secondary h-7 px-2.5 text-xs relative z-10 ${isArchived ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Allocate Budget
                </button>
              )}
            </div>

            {isLoadingTasks ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Loading tasks...</div>
            ) : budgetedTasks.length > 0 ? (
              <div className="space-y-4">
                {budgetedTasks.map((task: any) => {
                  const taskProgress = Number(task.budgetInfo?.progressPercentage || 0);
                  const consumed = Number(task.budgetInfo?.consumedHours || 0);
                  const remaining = Number(task.budgetInfo?.remainingHours || 0);

                  return (
                  <div key={task.id} className="flex flex-col p-4 bg-background rounded-[10px] border border-border transition-colors group">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-foreground">{task.name}</h3>
                          {!task.isBillable && <span className="text-[9px] font-semibold bg-accent text-muted-foreground px-1.5 py-0.5 rounded">Unbillable</span>}
                          {task.requiresClinicalCompliance && <span className="text-[9px] font-semibold bg-primary/20 text-info px-1.5 py-0.5 rounded">Clinical</span>}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{task.description || 'Allocated Task'}</p>
                        
                        <div className="flex items-center gap-1.5 mt-2 text-muted-foreground">
                          <Users className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-medium truncate">
                            {getAssignedNames(task)}
                          </span>
                        </div>
                      </div>
                       
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                          task.budgetInfo?.status === 'COMPLETED' ? 'bg-success/20 text-success' : 
                          task.budgetInfo?.status === 'IN_PROGRESS' || task.budgetInfo?.status === 'WARNING' ? 'bg-warning/20 text-warning' : 
                          task.budgetInfo?.status === 'HEALTHY' ? 'bg-emerald-500/10 text-emerald-400' :
                          'bg-muted/20 text-muted-foreground'
                        }`}>
                          {task.budgetInfo?.status?.replace('_', ' ') || 'HEALTHY'}
                        </span>
                         
                        {!isArchived && isAdminOrManager && (
                          // 🟢 THE BULLETPROOF INVISIBLE SELECT HACK for Budgeted Tasks 🟢
                          <div className="relative flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent transition-colors float-right">
                            <MoreVertical className="absolute w-5 h-5 text-muted-foreground pointer-events-none" style={{ zIndex: 1 }} />
                            <select
                              title="Actions"
                              className="absolute inset-0 w-full h-full cursor-pointer dark:[color-scheme:dark]"
                              style={{ opacity: 0, appearance: 'none', WebkitAppearance: 'none', zIndex: 10 }}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'edit') setEditingTask(task);
                                if (val === 'delete') handleDeleteTask(task.id, task.name);
                                e.target.value = 'default';
                              }}
                              defaultValue="default"
                            >
                              <option value="default" disabled hidden>⚙️ Actions</option>
                              <option value="edit" style={{ backgroundColor: solidMenuBg, color: solidText }}>✏️ Edit Task</option>
                              <option value="delete" style={{ backgroundColor: solidMenuBg, color: solidText }}>🗑️ Delete Task</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    <div 
                      className="cursor-pointer group/link mt-1 pt-3 border-t border-border"
                      onClick={() => router.push(`/reports?projectId=${project.id}&taskId=${task.id}`)}
                      title="View detailed time report for this specific task"
                    >
                      <div className="flex justify-between items-end mb-1.5">
                        <div className="text-xs">
                          <span className="text-muted-foreground group-hover/link:text-primary transition-colors">Used:</span> 
                          <span className="text-foreground font-medium ml-1 group-hover/link:text-primary transition-colors hover:underline">
                            {consumed.toFixed(1)}h
                          </span>
                          <span className="text-muted-foreground ml-2">Rem:</span> 
                          <span className={`font-medium ${remaining <= 0 ? 'text-destructive' : 'text-success'}`}>
                            {remaining.toFixed(1)}h
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground group-hover/link:text-primary transition-colors">{taskProgress.toFixed(1)}%</span>
                      </div>

                      <div className="w-full h-1.5 bg-background rounded-full overflow-hidden group-hover/link:ring-1 group-hover/link:ring-primary/50 transition-all border border-border">
                        <div 
                          className={`h-full rounded-full ${getProgressColor(task.budgetInfo?.status || 'HEALTHY', taskProgress)}`} 
                          style={{ width: `${Math.min(100, taskProgress)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                {isAdminOrManager ? 'No budgeted tasks. Allocate a task to a member to see it here.' : 'No budgeted tasks have been assigned to you yet.'}
              </p>
            )}
          </div>

          {/* Non-Budgeted Tasks */}
          {(isAdminOrManager || unbudgetedTasks.length > 0) && (
            <div className="bg-card border border-border rounded-[16px] p-5 shadow-md">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-muted-foreground" /> Non-Budgeted Tasks
                </h2>
                {isAdminOrManager && (
                  <button 
                    onClick={() => setIsNewTaskOpen(true)} 
                    disabled={isArchived}
                    className={`text-primary hover:underline text-xs flex items-center gap-1 relative z-10 ${isArchived ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Plus className="w-3 h-3" /> New Task
                  </button>
                )}
              </div>

              {isLoadingTasks ? (
                <div className="py-6 text-center text-xs text-muted-foreground">Loading tasks...</div>
              ) : unbudgetedTasks.length > 0 ? (
                <div className="space-y-2.5">
                  {unbudgetedTasks.map((task: any) => (
                    <div key={task.id} className="flex flex-col p-3.5 bg-background rounded-[10px] border border-border transition-colors opacity-80 hover:opacity-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs sm:text-sm font-semibold text-foreground">{task.name}</h3>
                            {!task.isBillable && <span className="text-[9px] font-semibold bg-accent text-muted-foreground px-1.5 py-0.5 rounded">Unbillable</span>}
                            {task.requiresClinicalCompliance && <span className="text-[9px] font-semibold bg-primary/20 text-info px-1.5 py-0.5 rounded">Clinical</span>}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{task.description || 'No description'}</p>
                          
                          <div className="flex items-center gap-1.5 mt-2.5 text-muted-foreground">
                            <Users className="w-3 h-3" />
                            <span className="text-[10px] font-semibold truncate max-w-[250px]">
                              {getAssignedNames(task)}
                            </span>
                          </div>
                        </div>
                         
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-muted/20 text-muted-foreground`}>
                            UNALLOCATED
                          </span>
                           
                          {!isArchived && isAdminOrManager && (
                            // 🟢 THE BULLETPROOF INVISIBLE SELECT HACK for Non-Budgeted Tasks 🟢
                            <div className="relative flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent transition-colors float-right">
                              <MoreVertical className="absolute w-5 h-5 text-muted-foreground pointer-events-none" style={{ zIndex: 1 }} />
                              <select
                                title="Actions"
                                className="absolute inset-0 w-full h-full cursor-pointer dark:[color-scheme:dark]"
                                style={{ opacity: 0, appearance: 'none', WebkitAppearance: 'none', zIndex: 10 }}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === 'edit') setEditingTask(task);
                                  if (val === 'delete') handleDeleteTask(task.id, task.name);
                                  e.target.value = 'default';
                                }}
                                defaultValue="default"
                              >
                                <option value="default" disabled hidden>⚙️ Actions</option>
                                <option value="edit" style={{ backgroundColor: solidMenuBg, color: solidText }}>✏️ Edit Task</option>
                                <option value="delete" style={{ backgroundColor: solidMenuBg, color: solidText }}>🗑️ Delete Task</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">All tasks are currently budgeted.</p>
              )}
            </div>
          )}

          <div className="bg-card border border-border rounded-[16px] p-5 space-y-4 shadow-md">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" /> Budget Allocations & Team
              </h2>
              {isAdminOrManager && (
                <button 
                  onClick={() => setIsAllocateOpen(true)} 
                  disabled={isArchived}
                  className={`btn-secondary h-7 px-2.5 text-xs flex items-center gap-1 relative z-10 ${isArchived ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Allocate Budget
                </button>
              )}
            </div>

            {isLoadingBudget ? (
               <div className="py-6 text-center text-xs text-muted-foreground">Loading allocations...</div>
            ) : projectBudget?.memberBudgets?.length > 0 ? (
              <div className="space-y-4 mt-2">
                {projectBudget.memberBudgets.map((member: any, idx: number) => (
                  <div key={idx} className="bg-background rounded-[10px] border border-border overflow-hidden">
                    <div className="flex items-center justify-between p-3.5 bg-accent/30 border-b border-border">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/20 text-info font-bold text-xs flex items-center justify-center border border-primary/30">
                          {member.user?.firstName?.[0] || 'U'}{member.user?.lastName?.[0] || ''}
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-foreground">{member.user?.firstName} {member.user?.lastName}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getStatusColor(member.status || 'NOT SET')}`}>
                              {member.status || 'NOT SET'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 space-y-3">
                      <div className="flex flex-col p-3 rounded-lg border border-border bg-card">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-medium text-muted-foreground">Shared Pool Contribution</p>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">Total time logged by this member</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground mb-0.5">Total Logged</p>
                            <p className="text-xs font-bold text-success">{Number(member.consumedHours || 0).toFixed(1)}h</p>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-background rounded-[10px] border border-dashed border-border mt-2">
                <Briefcase className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">No hours or tasks allocated yet</p>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-[16px] p-5 space-y-3 shadow-md">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> {isHealthcare ? 'Case' : 'Project'} Scope & Summary
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {description}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-[16px] p-5 space-y-4 shadow-md h-fit">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-info" /> Assigned Team ({projectBudget?.memberBudgets?.length || 0})
            </h2>

            {isLoadingBudget ? (
              <div className="py-4 text-center text-xs text-muted-foreground">Loading team...</div>
            ) : projectBudget?.memberBudgets?.length > 0 ? (
              <div className="space-y-2.5">
                {projectBudget.memberBudgets.map((member: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-background rounded-[10px] border border-border">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-primary/20 text-info font-bold text-xs flex items-center justify-center border border-primary/30">
                        {member.user?.firstName?.[0] || 'U'}{member.user?.lastName?.[0] || ''}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">{member.user?.firstName} {member.user?.lastName}</p>
                        <p className="text-[10px] text-muted-foreground">{isHealthcare ? 'Therapist / Provider' : 'Team Member'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-muted-foreground bg-background rounded-[10px] border border-dashed border-border">
                <Users className="w-7 h-7 mb-2 opacity-30" />
                <p className="text-xs">No team members assigned</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {isLogTimeOpen && !isArchived && (
        <LogTimeModal 
          isOpen={isLogTimeOpen}
          onClose={() => setIsLogTimeOpen(false)}
          defaultProjectId={project.id}
          tasks={visibleTasks} 
        />
      )}
       
      {isNewTaskOpen && !isArchived && (
        <NewTaskModal 
          isOpen={isNewTaskOpen}
          onClose={() => setIsNewTaskOpen(false)}
          projectId={project.id}
        />
      )}
       
      {!!editingTask && !isArchived && (
        <EditTaskModal 
          isOpen={!!editingTask} 
          onClose={() => setEditingTask(null)} 
          task={editingTask} 
        />
      )}

      {isAllocateOpen && !isArchived && (
        <AllocateBudgetModal 
          isOpen={isAllocateOpen}
          onClose={() => setIsAllocateOpen(false)}
          projectId={project.id}
        />
      )}

    </div>
  );
}
