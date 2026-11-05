'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Clock, 
  DollarSign, 
  Folder, 
  FileText, 
  AlertCircle,
  Play,
  Plus,
  MoreVertical,
  ArrowUpRight,
  History,
  LucideIcon,
  Edit,
  Trash2,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Activity,
  Trash,
  ArrowRightLeft,
  UploadCloud,
  DownloadCloud
} from 'lucide-react';

import { NewProjectModal } from '@/components/projects/NewProjectModal';
import { StartTimerModal } from '@/components/time-tracking/StartTimerModal';
import { LogTimeModal } from '@/components/time/LogTimeModal'; 
import { ImportDataModal } from '@/components/projects/ImportDataModal'; 

import { useProjects } from '@/features/projects/api/get-projects';
import { useTimeEntries } from '@/features/time/api/get-time-entries';
import { useAuthUser } from '@/features/auth/api/get-auth-user';
import { useOrganization } from '@/features/organizations/api/get-organization';

import { axiosInstance } from '@/lib/axios';
import toast from 'react-hot-toast';
import { useTheme } from 'next-themes'; 

interface SummaryStat {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  href: string; 
}

const getSafeArray = (data: any, key1: string, key2: string) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data[key1])) return data[key1];
  if (Array.isArray(data[key2])) return data[key2];
  if (data.data && Array.isArray(data.data[key1])) return data.data[key1];
  if (data.data && Array.isArray(data.data[key2])) return data.data[key2];
  return [];
};

export default function DashboardPage() {
  const { data: user } = useAuthUser();
  const { data: currentOrganization } = useOrganization(); 
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);
  const [isLogTimeModalOpen, setIsLogTimeModalOpen] = useState(false);
   
  const [isImportModalOpen, setIsImportModalOpen] = useState(false); 
   
  const [editData, setEditData] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  // 🟢 FIX: Removed status: 'ACTIVE' limit so we can fetch PLANNING cases too
  const { data: projectsData, isLoading: isLoadingProjects, refetch: refetchProjects } = useProjects({ limit: 50 });
  const { data: timeEntriesData, isLoading: isLoadingTime, refetch: refetchTime } = useTimeEntries({ limit: 50 });
  
  const canManageImportsExports = user ? ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role) || user.canManageImports === true : false;

  const activeProjects = getSafeArray(projectsData, 'projects', 'data');
  const recentEntries = getSafeArray(timeEntriesData, 'timeEntries', 'timesheets');

  const validEntries = recentEntries.filter((t: any) => t.approvalStatus !== 'REJECTED');

  const totalHours = validEntries.reduce((sum: number, t: any) => sum + Number(t.duration || 0), 0);
  const billableHours = validEntries.filter((t: any) => t.isBillable).reduce((sum: number, t: any) => sum + Number(t.duration || 0), 0);
  const nonBillableHours = validEntries.filter((t: any) => !t.isBillable).reduce((sum: number, t: any) => sum + Number(t.duration || 0), 0);
  const totalBillableAmount = validEntries.reduce((sum: number, t: any) => sum + Number(t.billableAmount || 0), 0);
  
  // 🟢 FIX: Include both ACTIVE and PLANNING statuses
  const filteredActiveProjects = activeProjects.filter((p: any) => p.status === 'ACTIVE' || p.status === 'PLANNING' || !p.status);
  const activeCount = filteredActiveProjects.length;

  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const solidMenuBg = isDark ? '#1E293B' : '#ffffff'; 
  const solidText = isDark ? '#ffffff' : '#0F172A';

  const isHealthcare = currentOrganization?.industryType === 'HEALTHCARE';

  const summaryStats: SummaryStat[] = [
    { title: 'Weekly Hours', value: `${totalHours.toFixed(1)}h`, subtitle: 'Logged recently', icon: Clock, color: 'text-info', href: '/time-tracking' },
    { title: 'Billable Amount', value: `$${totalBillableAmount.toFixed(2)}`, subtitle: `${billableHours.toFixed(1)}h billable`, icon: DollarSign, color: 'text-success', href: '/reports' },
    { title: isHealthcare ? 'Active Cases' : 'Active Projects', value: String(activeCount), subtitle: 'Currently running', icon: Folder, color: 'text-primary', href: '/projects' },
    { title: 'Non-Billable', value: `${nonBillableHours.toFixed(1)}h`, subtitle: 'Internal / Unpaid tasks', icon: AlertCircle, color: 'text-muted-foreground', href: '/reports' },
  ];

  const fetchAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const ts = new Date().getTime();
      const response = await axiosInstance.get(`/time-entries?fetchLogs=true&t=${ts}`);
      setAuditLogs(response.data.data.logs || []);
    } catch (error) {
      console.error("Failed to fetch logs", error);
      setAuditLogs([]); 
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchProjects(), refetchTime(), fetchAuditLogs()]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  const handleDeleteEntry = async (entryId: string) => {
    if (!window.confirm('Are you sure you want to delete this time entry? This action cannot be undone.')) return;
    try {
      await axiosInstance.delete(`/time-entries/${entryId}`);
      toast.success('Time entry deleted successfully');
      handleRefresh(); 
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete entry');
    }
  };

  const handleExport = () => {
    if (!recentEntries || recentEntries.length === 0) {
      toast.error("No data available to export.");
      return;
    }

    const headers = ["Date", "Project", "Task", "Employee", "Duration (h)", "Billable Amount ($)", "Status"];
    const csvContent = [
      headers.join(","),
      ...recentEntries.map((entry: any) => {
        const date = new Date(entry.date).toLocaleDateString();
        const project = `"${entry.project?.name || 'Unknown Project'}"`;
        const task = `"${entry.task?.name || 'General Task'}"`;
        const employee = `"${entry.user?.firstName || ''} ${entry.user?.lastName || ''}"`;
        const duration = entry.duration;
        const amount = entry.billableAmount || 0;
        const status = entry.approvalStatus || 'PENDING';
        return `${date},${project},${task},${employee},${duration},${amount},${status}`;
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `TimeFlow_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Export downloaded successfully!");
  };

  const getAuditLogUI = (log: any) => {
    const action = log.action;
    const userName = `${log.user?.firstName || 'User'} ${log.user?.lastName || ''}`;
    const duration = log.details?.duration || log.details?.newDuration;
    const durationStr = duration ? `${duration}h ` : '';
    const projStr = log.details?.projectName ? ` for project "${log.details.projectName}"` : '';

    switch(action) {
      case 'CREATED': return { icon: <Plus className="w-4 h-4 text-emerald-500" />, color: 'bg-emerald-500', label: `${userName} logged ${durationStr}time${projStr}.` };
      case 'UPDATED':
      case 'RESUBMITTED': return { icon: <Edit className="w-4 h-4 text-blue-500" />, color: 'bg-blue-500', label: `${userName} edited/resubmitted a time entry${projStr}.` };
      case 'DELETED': return { icon: <Trash className="w-4 h-4 text-rose-500" />, color: 'bg-rose-500', label: `${userName} deleted a ${durationStr}time entry${projStr}.` };
      case 'FIX_REQUESTED': return { icon: <AlertCircle className="w-4 h-4 text-orange-500" />, color: 'bg-orange-500', label: `Manager (${userName}) requested a fix${projStr}.` };
      case 'APPROVED': return { icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, color: 'bg-emerald-500', label: `Manager (${userName}) approved a ${durationStr}time entry${projStr}.` };
      case 'MOVED': return { icon: <ArrowRightLeft className="w-4 h-4 text-purple-500" />, color: 'bg-purple-500', label: `${userName} moved a ${durationStr}time entry.` };
      default: return { icon: <Activity className="w-4 h-4 text-primary" />, color: 'bg-primary', label: `${userName} performed an action.` };
    }
  };

  return (
    <div className="timeflow-container py-6 space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Good morning, {user ? user.firstName : 'there'}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground text-sm sm:text-base font-medium">
              Here's what's happening with your {isHealthcare ? 'cases' : 'projects'} today.
            </p>
            <button onClick={handleRefresh} className="p-1.5 hover:bg-accent rounded-md transition-colors" title="Refresh Data">
              <RefreshCw className={`w-4 h-4 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
         
        <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto flex-wrap sm:flex-nowrap justify-start lg:justify-end overflow-x-auto pb-2 sm:pb-0">
          
          {canManageImportsExports && (
            <>
              <button 
                onClick={handleExport}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 px-4 text-sm font-semibold text-muted-foreground bg-card border border-border rounded-lg hover:bg-accent hover:text-foreground transition-all z-10 relative shrink-0"
              >
                <DownloadCloud className="w-4 h-4" /> 
                <span className="hidden xl:inline">Export Data</span>
                <span className="xl:hidden">Export</span>
              </button>

              <button 
                onClick={() => setIsImportModalOpen(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 px-4 text-sm font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all shadow-sm z-10 relative shrink-0"
              >
                <UploadCloud className="w-4 h-4" /> 
                <span className="hidden xl:inline">Import Data</span>
                <span className="xl:hidden">Import</span>
              </button>
            </>
          )}

          <button 
            onClick={() => setIsProjectModalOpen(true)}
            className="btn-secondary flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 px-4 text-sm font-semibold z-10 relative shrink-0"
          >
            <Plus className="w-4 h-4" /> 
            <span className="hidden sm:inline">{isHealthcare ? 'New Case' : 'New Project'}</span>
            <span className="sm:hidden">New</span>
          </button>
            
          <button 
            onClick={() => setIsTimerModalOpen(true)}
            className="btn-primary flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 px-4 text-sm font-semibold shadow-[0_4px_14px_rgba(37,99,235,0.35)] z-10 relative shrink-0"
          >
            <Play className="w-4 h-4 fill-current" /> 
            <span className="hidden lg:inline">Start Timer</span>
            <span className="lg:hidden">Timer</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {summaryStats.map((stat, i) => (
          <Link href={stat.href} key={i} className="enterprise-card flex flex-col justify-between group cursor-pointer hover:border-primary/50 transition-all z-10 relative">
            <div className="flex items-start justify-between pointer-events-none">
              <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors">{stat.title}</span>
              <div className="h-8 w-8 rounded-full flex items-center justify-center bg-background border border-border group-hover:border-primary/50 transition-colors shadow-sm">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </div>
            <div className="mt-4 pointer-events-none">
              <div className="text-2xl sm:text-3xl font-extrabold text-foreground">{stat.value}</div>
              <p className="text-xs font-semibold text-muted-foreground mt-1 group-hover:text-primary transition-colors">{stat.subtitle}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="enterprise-table-container flex flex-col">
            <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-muted/50">
              <div>
                <h2 className="text-lg font-bold text-foreground">Recent Time Entries</h2>
                <p className="text-sm font-medium text-muted-foreground mt-0.5 hidden sm:block">Your logged hours recently.</p>
              </div>
              <Link href="/time-tracking" className="btn-ghost text-sm font-semibold h-9 px-3 flex items-center z-10 relative">
                View All
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead className="enterprise-table-header">
                  <tr>
                    <th className="enterprise-table-head pl-6">Date</th>
                    <th className="enterprise-table-head">{isHealthcare ? 'Case & Task' : 'Project & Task'}</th>
                    <th className="enterprise-table-head">Duration</th>
                    <th className="enterprise-table-head">Amount</th>
                    <th className="enterprise-table-head text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingTime || isRefreshing ? (
                    <tr>
                      <td colSpan={5} className="h-32 text-center bg-background">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50 text-primary" />
                        <p className="text-xs text-muted-foreground mt-2 opacity-50 font-medium">Loading entries...</p>
                      </td>
                    </tr>
                  ) : recentEntries.slice(0, 5).map((entry: any) => (
                    <tr key={entry.id} className="enterprise-table-row group hover:bg-accent transition-colors">
                      <td className="enterprise-table-cell whitespace-nowrap pl-6 text-muted-foreground font-semibold">
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td className="enterprise-table-cell">
                        <div className="font-bold text-foreground group-hover:text-primary transition-colors">
                          {entry.project?.name || 'Unknown Project'}
                        </div>
                        <div className="text-xs font-semibold text-muted-foreground mt-0.5 flex items-center gap-2">
                          {entry.task?.name || 'General Task'}
                          {!entry.isBillable && <span className="px-1.5 py-0.5 bg-background border border-border text-[9px] rounded text-muted-foreground uppercase">Non-Billable</span>}
                        </div>
                      </td>
                      <td className="enterprise-table-cell">
                        <div className="flex flex-col items-start justify-center">
                          <span className="font-bold font-mono text-base text-foreground">{entry.duration}h</span>
                          {entry.approvalStatus === 'REJECTED' && (
                            <span className="text-[10px] text-destructive flex items-center gap-1 mt-1 bg-destructive/10 border border-destructive/20 px-1.5 py-0.5 rounded-md shadow-sm w-fit whitespace-nowrap leading-none font-sans font-bold">
                              <AlertCircle className="w-3 h-3 shrink-0" /> Fix Requested
                            </span>
                          )}
                          {entry.approvalStatus === 'PENDING' && entry.isResubmitted && (
                            <span className="text-[10px] text-warning flex items-center gap-1 mt-1 bg-warning/10 border border-warning/20 px-1.5 py-0.5 rounded-md shadow-sm w-fit whitespace-nowrap leading-none font-sans font-bold">
                              <Clock className="w-3 h-3 shrink-0" /> Resubmitted
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="enterprise-table-cell font-bold text-success text-base">
                        {entry.billableAmount ? `$${Number(entry.billableAmount).toFixed(2)}` : '-'}
                      </td>
                      <td className="enterprise-table-cell text-right pr-6">
                        
                        <div className="relative flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent transition-colors float-right">
                          <MoreVertical className="absolute w-5 h-5 text-muted-foreground pointer-events-none" style={{ zIndex: 1 }} />
                          
                          <select
                            title="Actions"
                            className="absolute inset-0 w-full h-full cursor-pointer"
                            style={{ opacity: 0, appearance: 'none', WebkitAppearance: 'none', zIndex: 10 }}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'edit') { setEditData(entry); setIsLogTimeModalOpen(true); }
                              if (val === 'delete') { handleDeleteEntry(entry.id); }
                              e.target.value = 'default';
                            }}
                            defaultValue="default"
                          >
                            <option value="default" disabled hidden>⚙️ Actions</option>
                            <option value="edit" style={{ backgroundColor: solidMenuBg, color: solidText }}>
                              {entry.approvalStatus === 'DRAFT' || entry.status === 'DRAFT' ? '📝 Review & Submit' : '✏️ Edit Entry'}
                            </option>
                            <option value="delete" style={{ backgroundColor: solidMenuBg, color: solidText }}>
                              🗑️ Delete
                            </option>
                          </select>
                        </div>

                      </td>
                    </tr>
                  ))}
                  {recentEntries.length === 0 && !isLoadingTime && (
                    <tr>
                      <td colSpan={5} className="h-32 text-center text-muted-foreground bg-background">
                        <div className="flex flex-col items-center justify-center">
                          <Clock className="w-6 h-6 mb-2 opacity-50" />
                          <p className="font-semibold text-sm">No recent time entries found.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="enterprise-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-foreground text-lg">
                  {isHealthcare ? 'Active Cases / Patients' : 'Active Projects'}
                </h3>
                <Link href="/projects" className="text-muted-foreground hover:text-primary transition-colors z-10 relative">
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              {isLoadingProjects || isRefreshing ? (
                <div className="text-center py-6 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></div>
              ) : filteredActiveProjects.length > 0 ? (
                <div className="space-y-3">
                  {filteredActiveProjects.slice(0, 3).map((project: any, i: number) => {
                    return (
                    <Link href={`/projects/${project.slug || project.id}`} key={i} className="flex items-center justify-between p-3.5 rounded-[12px] border border-border bg-background hover:bg-accent transition-colors group z-10 relative">
                      <div className="pointer-events-none">
                        <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">{project.name}</div>
                        <div className="text-xs font-semibold text-muted-foreground mt-0.5">{project.client?.name || 'Internal'}</div>
                      </div>
                      <div className="text-right pointer-events-none">
                         <span className={`badge-base hidden sm:inline-flex px-2 py-0.5 text-[10px] ${project.status === 'PLANNING' ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/20' : 'badge-paid'}`}>
                           {project.status === 'PLANNING' ? 'Planning' : 'Active'}
                         </span>
                      </div>
                    </Link>
                  )})}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-background rounded-[12px] border border-dashed border-border">
                  <Folder className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm font-semibold">No active records found</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-1">
          <div className="enterprise-card flex flex-col p-6 h-full">
            <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-bold text-foreground">System Activity</h2>
              </div>
              <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-md uppercase tracking-wider">Live</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pl-4 pt-2 space-y-4">
              {isLoadingLogs || isLoadingTime ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : auditLogs.length > 0 ? (
                auditLogs.map((log: any, index: number) => {
                  const ui = getAuditLogUI(log);
                  return (
                    <div key={log.id || index} className="relative pl-6 pb-4 border-l border-border/50 last:border-0 last:pb-0">
                      <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full ${ui.color} shadow-sm ring-4 ring-card`}></div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground font-semibold mb-1">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(log.createdAt).toLocaleDateString()}
                        </span>
                        <p className="text-sm font-bold text-foreground leading-tight mt-0.5">
                          {ui.label}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-muted-foreground font-medium">
                           {ui.icon} <span className="uppercase tracking-wider font-bold">{log.entityType.replace('_', ' ')}</span>
                        </div>
                        {log.action === 'MOVED' && (
                          <div className="mt-2 text-[11px] text-muted-foreground bg-background p-2.5 rounded-md border border-border flex flex-col gap-1.5">
                            <div>
                              <span className="mr-1">From:</span>
                              <span className="font-bold text-foreground">{log.details?.fromProject || 'Unknown'}</span>
                              <span className="ml-1">({log.details?.fromTask || 'General Task'})</span>
                            </div>
                            <div>
                              <span className="mr-1">To:</span>
                              <span className="font-bold text-primary">{log.details?.toProject || 'Unknown'}</span>
                              <span className="text-primary/70 ml-1">({log.details?.toTask || 'General Task'})</span>
                            </div>
                          </div>
                        )}
                        {log.details?.reason && (
                          <div className="mt-2 text-[11px] text-destructive font-bold bg-destructive/10 p-2.5 rounded-md border border-destructive/20 flex flex-col gap-1 shadow-sm">
                            <span className="font-medium text-foreground">"{log.details.reason}"</span>
                          </div>
                        )}
                        {log.details?.description && log.action !== 'MOVED' && (
                          <div className="mt-2 text-[11px] text-muted-foreground italic bg-background p-2.5 rounded-md border border-border">
                            "{log.details.description.length > 50 ? log.details.description.substring(0, 50) + '...' : log.details.description}"
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10 mt-10">
                  <CheckCircle2 className="w-10 h-10 mb-3 opacity-30 text-success" />
                  <p className="text-sm font-medium text-center px-4">No recent activity found. Logs will appear here as team members interact.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <NewProjectModal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} />
      <StartTimerModal isOpen={isTimerModalOpen} onClose={() => setIsTimerModalOpen(false)} />
      <LogTimeModal isOpen={isLogTimeModalOpen} onClose={() => { setIsLogTimeModalOpen(false); setEditData(null); handleRefresh(); }} editData={editData} />
      
      <ImportDataModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />

    </div>
  );
}
