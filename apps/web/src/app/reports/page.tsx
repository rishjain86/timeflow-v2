'use client';

import React, { Suspense, useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { 
  Download, 
  Calendar, 
  Filter,
  BarChart3,
  TrendingUp,
  PieChart,
  DollarSign,
  ChevronDown,
  Loader2,
  FileText,
  AlertCircle,
  Clock,
  Search,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Activity,
  Users
} from 'lucide-react';
import { useTimeEntries } from '@/features/time/api/get-time-entries';
import { useUsers } from '@/features/users/api/get-users'; 
import { useOrganization } from '@/features/organizations/api/get-organization'; 
import toast from 'react-hot-toast';

import { 
  useBudgetReport, 
  useClinicalComplianceReport, 
  useOverageReport 
} from '@/features/reports/api/get-reports';

const getSafeArray = (data: any, key1: string, key2: string) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (data[key1] && Array.isArray(data[key1])) return data[key1];
  if (data[key2] && Array.isArray(data[key2])) return data[key2];
  if (data.data && Array.isArray(data.data[key1])) return data.data[key1];
  if (data.data && Array.isArray(data.data[key2])) return data.data[key2];
  return [];
};

function ReportsContent() {
  const searchParams = useSearchParams();
  const urlProjectId = searchParams.get('projectId') || undefined;
  const urlTaskId = searchParams.get('taskId') || undefined;
  const urlUserId = searchParams.get('userId') || undefined;

  const { data: currentOrganization } = useOrganization(); 
  const isHealthcare = currentOrganization?.industryType === 'HEALTHCARE'; 

  const [activeTab, setActiveTab] = useState<'TIME' | 'BUDGET' | 'COMPLIANCE' | 'OVERAGE'>('TIME');

  const [dateRange, setDateRange] = useState<
    '7_DAYS' | '15_DAYS' | 'SEMI_MONTH_CURRENT' | 'SEMI_MONTH_LAST' | 
    'THIS_MONTH' | 'LAST_MONTH' | '3_MONTHS' | '6_MONTHS' | 'ALL_TIME' | 'CUSTOM'
  >('THIS_MONTH');
  
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  
  const [filterProject, setFilterProject] = useState(urlProjectId || 'ALL');
  const [filterUser, setFilterUser] = useState(urlUserId || 'ALL');
  const [filterTask, setFilterTask] = useState(urlTaskId || 'ALL');

  const [keywordSearch, setKeywordSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const optionStyle = { backgroundColor: isDark ? '#0F172A' : '#ffffff', color: isDark ? '#ffffff' : '#0f172a' };

  const dates = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (dateRange === '7_DAYS') {
      return { start: new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000), end: endOfToday };
    }
    if (dateRange === '15_DAYS') {
      return { start: new Date(startOfToday.getTime() - 15 * 24 * 60 * 60 * 1000), end: endOfToday };
    }
    if (dateRange === 'SEMI_MONTH_CURRENT') {
      const day = now.getDate();
      if (day <= 15) {
        return { start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0), end: new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59, 999) };
      } else {
        return { start: new Date(now.getFullYear(), now.getMonth(), 16, 0, 0, 0, 0), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) };
      }
    }
    if (dateRange === 'SEMI_MONTH_LAST') {
      const day = now.getDate();
      if (day <= 15) {
        return { start: new Date(now.getFullYear(), now.getMonth() - 1, 16, 0, 0, 0, 0), end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999) };
      } else {
        return { start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0), end: new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59, 999) };
      }
    }
    if (dateRange === 'THIS_MONTH') {
      return { start: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) };
    }
    if (dateRange === 'LAST_MONTH') {
      return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0), end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999) };
    }
    if (dateRange === '3_MONTHS') {
      return { start: new Date(now.getFullYear(), now.getMonth() - 3, 1, 0, 0, 0, 0), end: endOfToday };
    }
    if (dateRange === '6_MONTHS') {
      return { start: new Date(now.getFullYear(), now.getMonth() - 6, 1, 0, 0, 0, 0), end: endOfToday };
    }
    if (dateRange === 'CUSTOM') {
      return { 
        start: customStart ? new Date(new Date(customStart).setHours(0, 0, 0, 0)) : null, 
        end: customEnd ? new Date(new Date(customEnd).setHours(23, 59, 59, 999)) : null 
      };
    }
    return { start: null, end: null }; 
  }, [dateRange, customStart, customEnd]);

  const { data: timeEntriesData, isLoading } = useTimeEntries({ 
    limit: 50, 
    projectId: urlProjectId,
    taskId: urlTaskId,
    userId: urlUserId
  });
   
  const reportData = getSafeArray(timeEntriesData, 'timeEntries', 'timesheets');

  const { data: usersList = [] } = useUsers();

  const uniqueProjects = useMemo(() => {
    const map = new Map();
    reportData.forEach((e: any) => { if (e.project) map.set(e.projectId, e.project); });
    return Array.from(map.values());
  }, [reportData]);

  const uniqueUsersFromEntries = useMemo(() => {
    const map = new Map();
    reportData.forEach((e: any) => { if (e.user) map.set(e.userId, e.user); });
    return Array.from(map.values());
  }, [reportData]);

  const allTeamMembers = useMemo(() => {
    const map = new Map();

    usersList.forEach((u: any) => {
      if (u && u.id) {
        map.set(u.id, {
          id: u.id,
          firstName: u.name ? u.name.split(' ')[0] : (u.firstName || ''),
          lastName: u.name ? u.name.split(' ').slice(1).join(' ') : (u.lastName || '')
        });
      }
    });

    uniqueUsersFromEntries.forEach((u: any) => {
      if (u && u.id && !map.has(u.id)) {
        map.set(u.id, {
          id: u.id,
          firstName: u.firstName || '',
          lastName: u.lastName || ''
        });
      }
    });

    return Array.from(map.values());
  }, [usersList, uniqueUsersFromEntries]);

  const uniqueTasks = useMemo(() => {
    const map = new Map();
    reportData.forEach((e: any) => { 
      if (filterProject !== 'ALL' && e.projectId !== filterProject) return;
      if (e.task && e.task.name) {
        const taskName = e.task.name.trim();
        if (!map.has(taskName)) {
          map.set(taskName, taskName);
        }
      }
    });
    return Array.from(map.values());
  }, [reportData, filterProject]);
   
  const validEntries = useMemo(() => {
    const approved = reportData.filter((t: any) => t.approvalStatus !== 'REJECTED');
    
    return approved.filter((entry: any) => {
      const entryTime = new Date(entry.date).getTime();
      const isDateValid = dateRange === 'ALL_TIME' || (dates.start && dates.end && entryTime >= dates.start.getTime() && entryTime <= dates.end.getTime());

      const isProjectValid = filterProject === 'ALL' || entry.projectId === filterProject;
      const isUserValid = filterUser === 'ALL' || entry.userId === filterUser;
      const isTaskValid = filterTask === 'ALL' || (entry.task && entry.task.name.trim() === filterTask);

      let isKeywordValid = true;
      if (keywordSearch.trim()) {
        const s = keywordSearch.toLowerCase();
        isKeywordValid = 
          entry.project?.name?.toLowerCase().includes(s) ||
          entry.task?.name?.toLowerCase().includes(s) ||
          entry.client?.name?.toLowerCase().includes(s) ||
          entry.description?.toLowerCase().includes(s) ||
          entry.user?.firstName?.toLowerCase().includes(s) ||
          entry.user?.lastName?.toLowerCase().includes(s);
      }

      return isDateValid && isProjectValid && isUserValid && isTaskValid && isKeywordValid;
    });
  }, [reportData, dateRange, dates, filterProject, filterUser, filterTask, keywordSearch]);

  const totalHours = validEntries.reduce((sum: number, t: any) => sum + Number(t.duration || 0), 0);
  const billableHours = validEntries.filter((t: any) => t.isBillable).reduce((sum: number, t: any) => sum + Number(t.duration || 0), 0);
  const totalBillableAmount = validEntries.reduce((sum: number, t: any) => sum + Number(t.billableAmount || 0), 0);
  const billableRatio = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;

  const formatDateSafe = (dateString: string) => {
    try {
      if (!dateString) return 'Invalid Date';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const chartData = useMemo(() => {
    const weeks = [
      { label: 'Week 1', billable: 0, nonBillable: 0, total: 0 },
      { label: 'Week 2', billable: 0, nonBillable: 0, total: 0 },
      { label: 'Week 3', billable: 0, nonBillable: 0, total: 0 },
      { label: 'Week 4', billable: 0, nonBillable: 0, total: 0 },
    ];

    validEntries.forEach((entry: any) => {
      const date = new Date(entry.date);
      const day = date.getDate();
      let weekIdx = Math.floor((day - 1) / 7);
      if (weekIdx > 3) weekIdx = 3; 

      const dur = Number(entry.duration) || 0;
      weeks[weekIdx].total += dur;
      if (entry.isBillable) weeks[weekIdx].billable += dur;
      else weeks[weekIdx].nonBillable += dur;
    });

    const maxVal = Math.max(...weeks.map((w: any) => w.total), 10); 
    const scaleMax = Math.ceil(maxVal / 10) * 10; 
     
    return { weeks, scaleMax };
  }, [validEntries]);

  const filteredTableData = validEntries;

  const exportToCSV = () => {
    if (filteredTableData.length === 0) return toast.error('No data to export');
    setIsExporting(true);

    try {
      const headers = ['Date', isHealthcare ? 'Case' : 'Project', isHealthcare ? 'Payor' : 'Client', 'Task', 'User', 'Duration (h)', 'Billable', 'Amount ($)', 'Status', 'Notes'];
       
      const rows = filteredTableData.map((e: any) => [
        formatDateSafe(e.date).replace(/,/g, ''),
        `"${e.project?.name || 'Unknown'}"`,
        // 🟢 FIX: Extract Payor directly from Assigned User (Therapist) instead of splitting the Patient name
        `"${e.client?.name || e.project?.client?.name || (e.project?.assignedTo ? `${e.project.assignedTo.firstName} ${e.project.assignedTo.lastName || ''}`.trim() : (isHealthcare ? 'Internal Payor' : 'Internal Client'))}"`,
        `"${e.task?.name || 'General'}"`,
        `"${e.user?.firstName || ''} ${e.user?.lastName || ''}"`,
        e.duration,
        e.isBillable ? 'Yes' : 'No',
        e.billableAmount || 0,
        e.approvalStatus || 'APPROVED',
        `"${(e.description || '').replace(/"/g, '""')}"` 
      ]);

      const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
       
      const a = document.createElement('a');
      a.href = url;
      a.download = `TimeFlow_Report_${dateRange}_${new Date().getTime()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
       
      toast.success('Report exported successfully!');
    } catch (error) {
      toast.error('Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const { data: budgetData, isLoading: isBudgetLoading } = useBudgetReport(activeTab === 'BUDGET' ? { projectId: urlProjectId } : undefined);
  const { data: complianceData, isLoading: isComplianceLoading } = useClinicalComplianceReport(activeTab === 'COMPLIANCE' ? { projectId: urlProjectId, userId: urlUserId } : undefined);
  const { data: overageData, isLoading: isOverageLoading } = useOverageReport(activeTab === 'OVERAGE' ? { projectId: urlProjectId, userId: urlUserId } : undefined);

  const budgets = budgetData?.data?.budgets || [];
  const complianceRecords = complianceData?.data?.records || [];
  const overageRequests = overageData?.data?.requests || [];

  return (
    <div className="timeflow-container space-y-6 animate-in fade-in duration-500 py-6">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="z-10 relative">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Time & Performance Reports
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Analyze your billable hours, {isHealthcare ? 'case' : 'project'} costs, and specific session notes.
          </p>
        </div>
        
        {activeTab === 'TIME' && (
          <div className="flex items-center gap-3 w-full sm:w-auto relative z-20">
            <button 
              onClick={exportToCSV}
              disabled={isExporting || isLoading || filteredTableData.length === 0}
              className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 h-[44px] shadow-md disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
              Export CSV Data
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-6 border-b border-border/50 overflow-x-auto custom-scrollbar pt-2 relative z-10">
        {[
          { id: 'TIME', label: 'Time & Performance', icon: BarChart3 },
          { id: 'BUDGET', label: isHealthcare ? 'Case Limits' : 'Budgets & Limits', icon: Briefcase },
          { id: 'COMPLIANCE', label: 'Clinical Compliance', icon: ShieldCheck },
          { id: 'OVERAGE', label: 'Extra Hours', icon: Activity },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 pb-3 px-2 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'TIME' && (
        <>
          <div className="enterprise-card p-4 flex flex-col gap-4 relative z-20 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#3B82F6]" />
              <h3 className="font-bold text-sm text-foreground">Advanced Analytics Filters</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Date Period</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <select 
                    value={dateRange} 
                    onChange={(e) => setDateRange(e.target.value as any)}
                    className="w-full h-10 pl-9 pr-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-[#3B82F6] transition-colors appearance-none"
                    style={optionStyle}
                  >
                    <option value="7_DAYS" style={optionStyle}>Last 7 Days</option>
                    <option value="15_DAYS" style={optionStyle}>Last 15 Days</option>
                    <option value="SEMI_MONTH_CURRENT" style={optionStyle}>Semi-Month (Current)</option>
                    <option value="SEMI_MONTH_LAST" style={optionStyle}>Semi-Month (Last)</option>
                    <option value="THIS_MONTH" style={optionStyle}>This Month</option>
                    <option value="LAST_MONTH" style={optionStyle}>Last Month</option>
                    <option value="3_MONTHS" style={optionStyle}>Last 3 Months</option>
                    <option value="6_MONTHS" style={optionStyle}>Last 6 Months</option>
                    <option value="ALL_TIME" style={optionStyle}>All Time</option>
                    <option value="CUSTOM" style={optionStyle}>Custom Dates...</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-50 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Team Member</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <select 
                    value={filterUser} 
                    onChange={(e) => setFilterUser(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-[#3B82F6] transition-colors appearance-none"
                    style={optionStyle}
                  >
                    <option value="ALL" style={optionStyle}>All Team Members</option>
                    {allTeamMembers.map((u: any) => (
                      <option key={u.id} value={u.id} style={optionStyle}>{u.firstName} {u.lastName || ''}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-50 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{isHealthcare ? 'Case' : 'Project'}</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <select 
                    value={filterProject} 
                    onChange={(e) => { setFilterProject(e.target.value); setFilterTask('ALL'); }}
                    className="w-full h-10 pl-9 pr-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-[#3B82F6] transition-colors appearance-none"
                    style={optionStyle}
                  >
                    <option value="ALL" style={optionStyle}>All {isHealthcare ? 'Cases' : 'Projects'}</option>
                    {uniqueProjects.map((p: any) => (
                      <option key={p.id} value={p.id} style={optionStyle}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-50 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Task</label>
                <div className="relative">
                  <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <select 
                    value={filterTask} 
                    onChange={(e) => setFilterTask(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-[#3B82F6] transition-colors appearance-none"
                    disabled={filterProject === 'ALL' && uniqueTasks.length === 0}
                    style={optionStyle}
                  >
                    <option value="ALL" style={optionStyle}>All Tasks</option>
                    {uniqueTasks.map((taskName: string) => (
                      <option key={taskName} value={taskName} style={optionStyle}>{taskName}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-50 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Keyword Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input 
                    type="text"
                    placeholder="Search logs, names..."
                    value={keywordSearch}
                    onChange={(e) => setKeywordSearch(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:border-[#3B82F6] transition-colors"
                  />
                </div>
              </div>

            </div>

            {dateRange === 'CUSTOM' && (
              <div className="flex items-center gap-4 mt-2 p-3 bg-background rounded-lg border border-border border-dashed">
                <div className="flex flex-col gap-1 w-full max-w-[200px]">
                  <label className="text-xs font-bold text-muted-foreground">Start Date</label>
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full h-9 px-3 bg-card border border-border rounded-md text-sm" />
                </div>
                <div className="flex flex-col gap-1 w-full max-w-[200px]">
                  <label className="text-xs font-bold text-muted-foreground">End Date</label>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full h-9 px-3 bg-card border border-border rounded-md text-sm" />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 relative z-10 animate-in fade-in slide-in-from-bottom-3">
            
            <div className="enterprise-card group hover:border-primary/50 transition-colors flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-4 overflow-hidden p-3 md:p-5">
              <div className="p-2 md:p-3 bg-[#3B82F6]/20 text-[#3B82F6] rounded-lg md:rounded-xl group-hover:bg-[#3B82F6] group-hover:text-white transition-colors shrink-0">
                <BarChart3 className="w-4 h-4 md:w-6 md:h-6" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col items-center md:items-start w-full">
                <p className="text-[10px] md:text-sm font-medium text-muted-foreground truncate w-full text-center md:text-left leading-tight">Total Hours</p>
                {isLoading ? <Loader2 className="w-3 h-3 md:w-5 md:h-5 animate-spin mt-1 text-[#3B82F6]"/> : (
                  <h3 className="text-[13px] sm:text-sm md:text-2xl font-bold text-foreground mt-1 md:mt-1 tracking-tight truncate">{totalHours.toFixed(1)}h</h3>
                )}
                <p className="hidden xl:flex text-[10px] md:text-xs text-[#22C55E] mt-1.5 items-center gap-1 font-medium truncate">
                  <TrendingUp className="w-3 h-3 shrink-0" /> Filtered Data
                </p>
              </div>
            </div>

            <div className="enterprise-card group hover:border-primary/50 transition-colors flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-4 overflow-hidden p-3 md:p-5">
              <div className="p-2 md:p-3 bg-[#22C55E]/20 text-[#22C55E] rounded-lg md:rounded-xl group-hover:bg-[#22C55E] group-hover:text-white transition-colors shrink-0">
                <PieChart className="w-4 h-4 md:w-6 md:h-6" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col items-center md:items-start w-full">
                <p className="text-[10px] md:text-sm font-medium text-muted-foreground truncate w-full text-center md:text-left leading-tight">Billable %</p>
                {isLoading ? <Loader2 className="w-3 h-3 md:w-5 md:h-5 animate-spin mt-1 text-[#22C55E]"/> : (
                  <h3 className="text-[13px] sm:text-sm md:text-2xl font-bold text-foreground mt-1 md:mt-1 tracking-tight truncate">{billableRatio.toFixed(1)}%</h3>
                )}
                <p className="hidden xl:flex text-[10px] md:text-xs text-[#22C55E] mt-1.5 items-center gap-1 font-medium truncate">
                  <TrendingUp className="w-3 h-3 shrink-0" /> System avg
                </p>
              </div>
            </div>

            <div className="enterprise-card group hover:border-primary/50 transition-colors flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-4 overflow-hidden p-3 md:p-5">
              <div className="p-2 md:p-3 bg-[#F59E0B]/20 text-[#F59E0B] rounded-lg md:rounded-xl group-hover:bg-[#F59E0B] group-hover:text-foreground transition-colors shrink-0">
                <DollarSign className="w-4 h-4 md:w-6 md:h-6" />
              </div>
              <div className="flex-1 min-w-0 flex flex-col items-center md:items-start w-full">
                <p className="text-[10px] md:text-sm font-medium text-muted-foreground truncate w-full text-center md:text-left leading-tight">Amount</p>
                {isLoading ? <Loader2 className="w-3 h-3 md:w-5 md:h-5 animate-spin mt-1 text-[#F59E0B]"/> : (
                  <h3 className="text-[13px] sm:text-sm md:text-2xl font-bold text-foreground mt-1 md:mt-1 tracking-tight truncate">${totalBillableAmount.toFixed(2)}</h3>
                )}
                <p className="hidden xl:flex text-[10px] md:text-xs text-muted-foreground mt-1.5 items-center justify-between gap-1 truncate w-full">
                  All tracking
                </p>
              </div>
            </div>
            
          </div>

          <div className="enterprise-card relative z-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-bold text-foreground">Weekly Hours Breakdown</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Billable vs Non-Billable hours over the period.</p>
              </div>
            </div>
            
            <div className="relative h-[280px] w-full">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8">
                {[4, 3, 2, 1, 0].map((step) => {
                  const val = (chartData.scaleMax / 4) * step;
                  return (
                    <div className="w-full border-t border-dashed border-border flex items-start" key={step}>
                      <span className="text-[10px] text-muted-foreground -mt-2.5 bg-card pr-2">{val}h</span>
                    </div>
                  )
                })}
              </div>

              <div className="absolute inset-0 flex items-end justify-around gap-2 sm:gap-4 pl-8 pb-8">
                {chartData.weeks.map((week, idx) => {
                  const totalHeightPct = chartData.scaleMax > 0 ? (week.total / chartData.scaleMax) * 100 : 0;
                  const billablePct = week.total > 0 ? (week.billable / week.total) * 100 : 0;
                  const nonBillablePct = week.total > 0 ? (week.nonBillable / week.total) * 100 : 0;

                  return (
                    <div key={idx} className="w-full flex flex-col items-center gap-3 group relative z-10 h-[200px] justify-end">
                      <div className="w-full max-w-[48px] flex flex-col justify-end relative cursor-pointer group-hover:scale-105 transition-transform duration-300 h-full">
                        
                        <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-card border border-primary text-foreground font-medium text-xs py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-xl flex flex-col items-center">
                          <span className="font-bold">Total: {week.total.toFixed(1)}h</span>
                          {week.billable > 0 && <span className="text-[10px] text-muted-foreground">${(week.billable * 99).toFixed(0)} Approx</span>}
                        </div>

                        {week.total > 0 && (
                          <div 
                            className="w-full flex flex-col justify-end rounded-[6px] overflow-hidden transition-all duration-700 shadow-md" 
                            style={{ height: `${totalHeightPct}%`, minHeight: '6px' }}
                          >
                            {week.nonBillable > 0 && (
                              <div 
                                className="w-full transition-colors opacity-70 group-hover:opacity-100" 
                                style={{ height: `${nonBillablePct}%`, backgroundColor: '#F59E0B' }}
                              ></div>
                            )}
                            {week.billable > 0 && (
                              <div 
                                className="w-full transition-colors group-hover:brightness-125" 
                                style={{ height: `${billablePct}%`, backgroundColor: '#3B82F6' }}
                              ></div>
                            )}
                          </div>
                        )}
                      </div>
                      <span className={`text-xs font-semibold transition-colors shrink-0 ${week.total > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>{week.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-6 pt-4 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-[2px] shadow-sm" style={{ backgroundColor: '#3B82F6' }}></div>
                <span className="text-sm font-medium text-foreground">Billable Hours</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-[2px] opacity-70" style={{ backgroundColor: '#F59E0B' }}></div>
                <span className="text-sm font-medium text-muted-foreground">Non-Billable Hours</span>
              </div>
            </div>
          </div>

          <div className="enterprise-table-container flex flex-col relative z-10 animate-in fade-in slide-in-from-bottom-5">
            <div className="p-5 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#3B82F6]" /> Detailed Log Report {urlTaskId ? '(Filtered)' : ''}
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px] table-fixed">
                <thead className="enterprise-table-header">
                  <tr>
                    <th className="enterprise-table-head pl-6 w-[15%]">Date</th>
                    <th className="enterprise-table-head w-[20%]">{isHealthcare ? 'Case' : 'Project'}</th>
                    <th className="enterprise-table-head w-[22%]">{isHealthcare ? 'Payor, Task & User' : 'Client, Task & User'}</th>
                    <th className="enterprise-table-head w-[25%]">Notes / Tx Session Details</th>
                    <th className="enterprise-table-head text-right w-[8%]">Hours</th>
                    <th className="enterprise-table-head text-right pr-6 w-[10%]">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="h-32 text-center bg-background">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50 text-[#3B82F6]" />
                        <p className="text-xs text-muted-foreground mt-2 opacity-50">Loading detailed reports...</p>
                      </td>
                    </tr>
                  ) : filteredTableData.length > 0 ? (
                    filteredTableData.map((row: any) => (
                      <tr key={row.id} className="enterprise-table-row hover:bg-accent/50 transition-colors group border-b border-border/50">
                        
                        <td className="enterprise-table-cell pl-6 align-top pt-4">
                          <span className="font-medium text-muted-foreground block truncate">
                            {formatDateSafe(row.date)}
                          </span>
                          <span className={`text-[10px] mt-1 inline-block px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${row.isBillable ? 'bg-[#22C55E]/20 text-[#22C55E]' : 'bg-accent text-muted-foreground'}`}>
                            {row.isBillable ? 'Billable' : 'Non-Billable'}
                          </span>
                        </td>
                        
                        <td className="enterprise-table-cell align-top pt-4 pr-4">
                          <div className="font-semibold text-foreground group-hover:text-[#3B82F6] transition-colors break-words whitespace-normal leading-tight">
                            {row.project?.name || `Unknown ${isHealthcare ? 'Case' : 'Project'}`}
                          </div>
                        </td>

                        <td className="enterprise-table-cell align-top pt-4 pr-4">
                          <div className="text-sm font-medium text-foreground break-words whitespace-normal">
                            {row.task?.name || 'General Task'}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 break-words whitespace-normal flex flex-col gap-0.5">
                            {/* 🟢 FIX: Extract Payor directly from Assigned User (Therapist) */}
                            <span className="text-[#3B82F6] font-medium">
                               {row.client?.name || row.project?.client?.name || (row.project?.assignedTo ? `${row.project.assignedTo.firstName} ${row.project.assignedTo.lastName || ''}`.trim() : (isHealthcare ? 'Internal Payor' : 'Internal Client'))}
                            </span>
                            <span>{row.user?.firstName} {row.user?.lastName}</span>
                          </div>
                        </td>

                        <td className="enterprise-table-cell align-top pt-4 pb-4 pr-4">
                          <div className="text-sm text-muted-foreground leading-relaxed whitespace-normal break-words">
                            {row.description ? `"${row.description}"` : <span className="italic opacity-50">No notes provided</span>}
                          </div>
                          
                          {row.approvalStatus === 'REJECTED' && row.rejectionReason && (
                            <div className="text-[11px] text-destructive mt-2 font-bold bg-destructive/10 p-2 rounded border border-destructive/20 flex items-start gap-1.5 shadow-sm">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> 
                              <div className="flex flex-col whitespace-normal break-words">
                                <span>Fix Requested:</span>
                                <span className="font-medium text-muted-foreground mt-0.5">{row.rejectionReason}</span>
                              </div>
                            </div>
                          )}
                          
                          {row.approvalStatus === 'PENDING' && row.isResubmitted && (
                            <div className="text-[11px] text-[#F59E0B] mt-2 font-bold bg-[#F59E0B]/10 p-2 rounded w-fit border border-[#F59E0B]/20 flex items-center gap-1.5 shadow-sm">
                              <Clock className="w-3.5 h-3.5 shrink-0" /> 
                              <div className="flex flex-col">
                                <span>Resubmitted: <span className="font-medium text-muted-foreground ml-0.5">Pending Manager Review</span></span>
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="enterprise-table-cell text-right font-mono font-bold text-foreground align-top pt-4 pr-2 text-base">
                          {row.duration}h
                        </td>

                        <td className="enterprise-table-cell text-right font-bold text-[#22C55E] pr-6 align-top pt-4 text-base">
                          {row.billableAmount ? `$${Number(row.billableAmount).toFixed(2)}` : '-'}
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="h-32 text-center text-muted-foreground bg-background">
                        <p>No time entries found for this filter selection.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'BUDGET' && (
        <div className="enterprise-table-container flex flex-col relative z-10 animate-in fade-in slide-in-from-bottom-2">
          <div className="p-5 border-b border-border bg-card">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-[#3B82F6]" /> {isHealthcare ? 'Case Limit Status' : 'Project Budget Status'}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="enterprise-table-header">
                <tr>
                  <th className="enterprise-table-head pl-6 w-[25%]">{isHealthcare ? 'Case & Payor' : 'Project & Client'}</th>
                  <th className="enterprise-table-head">Total Budget</th>
                  <th className="enterprise-table-head">Consumed</th>
                  <th className="enterprise-table-head">Remaining</th>
                  <th className="enterprise-table-head">Progress</th>
                  <th className="enterprise-table-head pr-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {isBudgetLoading ? (
                  <tr>
                    <td colSpan={6} className="h-32 text-center bg-background">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50 text-[#3B82F6]" />
                    </td>
                  </tr>
                ) : budgets.length > 0 ? (
                  budgets.map((b: any) => (
                    <tr key={b.id} className="enterprise-table-row hover:bg-accent/50 group border-b border-border/50">
                      <td className="enterprise-table-cell pl-6 py-4">
                        <div className="font-bold text-foreground">{b.projectName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{b.clientName}</div>
                      </td>
                      <td className="enterprise-table-cell font-mono font-medium">{b.totalAllocatedHours}h</td>
                      <td className="enterprise-table-cell font-mono text-muted-foreground">{b.consumedHours}h</td>
                      <td className="enterprise-table-cell font-mono text-[#22C55E]">{b.remainingHours}h</td>
                      <td className="enterprise-table-cell w-[20%]">
                        <div className="flex items-center gap-3">
                          <div className="w-full bg-accent rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full ${b.progressPercentage > 90 ? 'bg-destructive' : b.progressPercentage > 75 ? 'bg-[#F59E0B]' : 'bg-[#3B82F6]'}`} 
                              style={{ width: `${Math.min(b.progressPercentage, 100)}%` }} 
                            />
                          </div>
                          <span className="text-xs font-bold w-10 text-right">{b.progressPercentage.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="enterprise-table-cell pr-6 text-right">
                        <span className={`badge-base ${
                          b.budgetStatus === 'HEALTHY' ? 'badge-paid' : 
                          b.budgetStatus === 'WARNING' ? 'bg-[#F59E0B]/20 text-[#F59E0B]' : 
                          'bg-destructive/20 text-destructive'
                        }`}>
                          {b.budgetStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="h-32 text-center text-muted-foreground bg-background">No budget data available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'COMPLIANCE' && (
        <div className="enterprise-table-container flex flex-col relative z-10 animate-in fade-in slide-in-from-bottom-2">
          <div className="p-5 border-b border-border bg-card">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#3B82F6]" /> Clinical Compliance Records
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="enterprise-table-header">
                <tr>
                  <th className="enterprise-table-head pl-6">Date & User</th>
                  <th className="enterprise-table-head">{isHealthcare ? 'Case & Task' : 'Project & Task'}</th>
                  <th className="enterprise-table-head text-center">CNR Doc</th>
                  <th className="enterprise-table-head text-center">Attendance</th>
                  <th className="enterprise-table-head pr-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {isComplianceLoading ? (
                  <tr>
                    <td colSpan={5} className="h-32 text-center bg-background">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50 text-[#3B82F6]" />
                    </td>
                  </tr>
                ) : complianceRecords.length > 0 ? (
                  complianceRecords.map((r: any) => (
                    <tr key={r.id} className="enterprise-table-row hover:bg-accent/50 group border-b border-border/50">
                      <td className="enterprise-table-cell pl-6 py-4">
                        <div className="font-semibold text-foreground">{formatDateSafe(r.date)}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{r.userName}</div>
                      </td>
                      <td className="enterprise-table-cell py-4">
                        <div className="font-semibold text-foreground">{r.projectName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{r.taskName || 'General'}</div>
                      </td>
                      <td className="enterprise-table-cell text-center">
                        {r.hasCnrDocument || r.appointmentCnrApproved ? 
                          <CheckCircle2 className="w-5 h-5 text-[#22C55E] mx-auto" /> : 
                          <XCircle className="w-5 h-5 text-destructive mx-auto opacity-50" />
                        }
                      </td>
                      <td className="enterprise-table-cell text-center">
                        {r.hasAttendanceDocument || r.attendancePresent ? 
                          <CheckCircle2 className="w-5 h-5 text-[#22C55E] mx-auto" /> : 
                          <XCircle className="w-5 h-5 text-destructive mx-auto opacity-50" />
                        }
                      </td>
                      <td className="enterprise-table-cell pr-6 text-right">
                        <span className={`badge-base ${r.status === 'COMPLIANT' ? 'badge-paid' : 'bg-destructive/10 text-destructive'}`}>
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="h-32 text-center text-muted-foreground bg-background">No compliance records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'OVERAGE' && (
        <div className="enterprise-table-container flex flex-col relative z-10 animate-in fade-in slide-in-from-bottom-2">
          <div className="p-5 border-b border-border bg-card">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#3B82F6]" /> Overage & Extra Hours Requests
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="enterprise-table-header">
                <tr>
                  <th className="enterprise-table-head pl-6">Request Date</th>
                  <th className="enterprise-table-head">{isHealthcare ? 'Case' : 'Project'}</th>
                  <th className="enterprise-table-head">Requested By</th>
                  <th className="enterprise-table-head text-center">Extra Hours</th>
                  <th className="enterprise-table-head pr-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {isOverageLoading ? (
                  <tr>
                    <td colSpan={5} className="h-32 text-center bg-background">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50 text-[#3B82F6]" />
                    </td>
                  </tr>
                ) : overageRequests.length > 0 ? (
                  overageRequests.map((req: any) => (
                    <tr key={req.id} className="enterprise-table-row hover:bg-accent/50 group border-b border-border/50">
                      <td className="enterprise-table-cell pl-6 py-4 font-medium text-muted-foreground">
                        {formatDateSafe(req.createdAt)}
                      </td>
                      <td className="enterprise-table-cell py-4">
                        <div className="font-semibold text-foreground">{req.projectName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{req.clientName}</div>
                      </td>
                      <td className="enterprise-table-cell py-4 font-medium">
                        {req.userName}
                      </td>
                      <td className="enterprise-table-cell text-center font-mono font-bold text-[#3B82F6]">
                        +{req.requestedHours}h
                      </td>
                      <td className="enterprise-table-cell pr-6 text-right">
                        <span className={`badge-base ${
                          req.status === 'APPROVED' ? 'badge-paid' : 
                          req.status === 'PENDING' ? 'bg-[#F59E0B]/20 text-[#F59E0B]' : 
                          'bg-destructive/10 text-destructive'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="h-32 text-center text-muted-foreground bg-background">No extra hours requests found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-[#3B82F6]" /></div>}>
      <ReportsContent />
    </Suspense>
  );
}
