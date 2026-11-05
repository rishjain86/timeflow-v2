'use client';

import React, { useEffect, useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Loader2, 
  Activity, 
  Plus, 
  Edit, 
  Trash, 
  AlertCircle, 
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft // 🟢 NEW IMPORT FOR MOVED
} from 'lucide-react';
import { axiosInstance } from '@/lib/axios';

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1, total: 0 });

  const fetchLogs = async (currentPage: number) => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get(`/time-entries?fetchLogs=true&page=${currentPage}&limit=20`);
      setLogs(response.data.data.logs || []);
      if (response.data.meta) {
        setMeta(response.data.meta);
      }
    } catch (error) {
      console.error("Failed to fetch system logs", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  const getAuditLogUI = (log: any) => {
    const action = log.action;
    switch(action) {
      case 'CREATED': return { icon: <Plus className="w-4 h-4 text-success" />, badge: 'bg-success/20 text-success' };
      case 'UPDATED': 
      case 'RESUBMITTED': return { icon: <Edit className="w-4 h-4 text-info" />, badge: 'bg-info/20 text-info' };
      case 'DELETED': return { icon: <Trash className="w-4 h-4 text-destructive" />, badge: 'bg-destructive/20 text-destructive' };
      case 'FIX_REQUESTED': return { icon: <AlertCircle className="w-4 h-4 text-[#FF453A]" />, badge: 'bg-[#FF453A]/20 text-[#FF453A]' };
      case 'APPROVED': return { icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, badge: 'bg-emerald-500/20 text-emerald-400' };
      case 'MOVED': return { icon: <ArrowRightLeft className="w-4 h-4 text-orange-400" />, badge: 'bg-orange-500/20 text-orange-400' }; // 🟢 NEW UI BADGE
      default: return { icon: <Activity className="w-4 h-4 text-primary" />, badge: 'bg-primary/20 text-primary' };
    }
  };

  return (
    <div className="timeflow-container py-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <History className="w-7 h-7 text-primary" /> System Audit Logs
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Track all organizational activities, updates, and deletions securely.
          </p>
        </div>
      </div>

      <div className="enterprise-card p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search logs..." className="input-field pl-9" disabled />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button className="btn-secondary w-full sm:w-auto flex items-center justify-center gap-2">
            <Filter className="w-4 h-4" /> Filter Logs
          </button>
        </div>
      </div>

      <div className="enterprise-table-container">
        <div className="overflow-x-auto relative">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="enterprise-table-header">
              <tr>
                <th className="enterprise-table-head pl-6 w-[20%]">Date & Time</th>
                <th className="enterprise-table-head w-[20%]">User</th>
                <th className="enterprise-table-head w-[15%]">Action</th>
                <th className="enterprise-table-head w-[45%]">Activity Details (Snapshot)</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="text-center py-16 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    Loading secure audit logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-16 text-muted-foreground">
                    No system activity recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => {
                  const ui = getAuditLogUI(log);
                  const userName = `${log.user?.firstName || 'Unknown'} ${log.user?.lastName || ''}`;

                  return (
                    <tr key={log.id} className="enterprise-table-row hover:bg-[#1E293B]/50 transition-colors">
                      <td className="enterprise-table-cell pl-6 text-[#CBD5E1] text-sm">
                        <div className="font-medium">{new Date(log.createdAt).toLocaleDateString()}</div>
                        <div className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleTimeString()}</div>
                      </td>

                      <td className="enterprise-table-cell">
                        <div className="font-medium text-white">{userName}</div>
                        <div className="text-xs text-muted-foreground">{log.user?.role?.replace('_', ' ') || 'USER'}</div>
                      </td>

                      <td className="enterprise-table-cell">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit ${ui.badge}`}>
                          {ui.icon} {log.action.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="enterprise-table-cell">
                        <div className="text-sm text-[#E2E8F0] break-words">
                          {log.details?.projectName && log.action !== 'MOVED' && (
                            <span className="font-semibold text-primary block mb-0.5">Project: {log.details.projectName}</span>
                          )}
                          {log.details?.taskName && log.action !== 'MOVED' && (
                            <span className="text-xs text-muted-foreground block mb-1">Task: {log.details.taskName}</span>
                          )}

                          {/* 🟢 NEW FEATURE: From -> To project tracking display for MOVED */}
                          {log.action === 'MOVED' && log.details && (
                            <div className="mt-1 text-sm bg-black/20 p-2.5 rounded border border-border/50">
                               <div className="flex flex-col gap-1">
                                 <div><span className="text-muted-foreground mr-1">From:</span> <span className="text-white font-medium">{log.details.fromProject}</span> <span className="text-xs text-muted-foreground ml-1">({log.details.fromTask})</span></div>
                                 <div><span className="text-muted-foreground mr-1">To:</span> <span className="text-info font-medium">{log.details.toProject}</span> <span className="text-xs text-info/70 ml-1">({log.details.toTask})</span></div>
                               </div>
                            </div>
                          )}

                          <div className="mt-1">
                            {log.details?.duration && <span>Duration: <span className="font-bold text-white">{log.details.duration}h</span> </span>}
                            {log.details?.newDuration && <span>Updated: <span className="line-through opacity-50">{log.details.previousDuration}h</span> ➜ <span className="font-bold text-info">{log.details.newDuration}h</span></span>}
                          </div>

                          {log.details?.reason && (
                            <div className="mt-1.5 text-xs text-[#FF453A] bg-[#FF453A]/10 p-1.5 rounded inline-block border border-[#FF453A]/20">
                              Reason: {log.details.reason}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-border bg-[#0F172A] flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Showing logs {logs.length > 0 ? (page - 1) * 20 + 1 : 0} to {Math.min(page * 20, meta.total)} of {meta.total}</span>
          <div className="flex gap-2">
            <button 
              disabled={page === 1 || isLoading} 
              onClick={() => setPage(p => p - 1)}
              className="btn-secondary h-8 px-3 text-xs flex items-center gap-1 disabled:opacity-50"
            >
              <ChevronLeft className="w-3 h-3" /> Prev
            </button>
            <button 
              disabled={page >= meta.totalPages || isLoading} 
              onClick={() => setPage(p => p + 1)}
              className="btn-secondary h-8 px-3 text-xs flex items-center gap-1 disabled:opacity-50"
            >
              Next <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
