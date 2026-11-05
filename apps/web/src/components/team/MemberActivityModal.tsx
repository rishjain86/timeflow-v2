'use client';

import React, { useState } from 'react';
import { X, Loader2, Clock, Calendar, CheckCircle2, FileText, Activity, DollarSign, ShieldAlert } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';
import { format, subDays, subMonths, subYears } from 'date-fns';

interface MemberActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: any;
}

type DateRange = '7d' | '15d' | '1m' | '3m' | '6m' | '1y' | 'all';

export function MemberActivityModal({ isOpen, onClose, member }: MemberActivityModalProps) {
  const [range, setRange] = useState<DateRange>('30d' as any); // default 1 month roughly

  // Fetch individual member's activity and time logs
  const { data: activityData, isLoading } = useQuery({
    queryKey: ['member-activity', member?.id, range],
    queryFn: async () => {
      const res = await axiosInstance.get(`/users/${member.id}/activity?range=${range}`);
      return res.data?.data || res.data;
    },
    enabled: isOpen && !!member?.id,
  });

  if (!isOpen || !member) return null;

  const entries = activityData?.timeEntries || [];
  const auditLogs = activityData?.auditLogs || [];
  const stats = activityData?.stats || { totalHours: 0, billableAmount: 0, totalEntries: 0 };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0F172A] border border-border rounded-[20px] w-full max-w-[850px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold bg-primary/20 text-primary border border-primary/30">
              {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{member.firstName} {member.lastName}</h2>
              <p className="text-xs text-muted-foreground">{member.email} • <span className="uppercase text-primary font-semibold">{member.role}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Time Range Selector Filters */}
        <div className="px-6 py-3 bg-muted/30 border-b border-border flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-primary" /> Timeframe Filter:
          </span>
          <div className="flex flex-wrap gap-1.5 bg-white dark:bg-[#0F172A] p-1 rounded-xl border border-border">
            {(['7d', '15d', '1m', '3m', '6m', '1y', 'all'] as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all uppercase ${
                  range === r ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r === 'all' ? 'Lifetime' : r}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar bg-white dark:bg-[#0F172A]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-sm">Loading individual activity audit trail...</p>
            </div>
          ) : (
            <>
              {/* Quick Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-background p-4 rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-primary" /> Total Tracked Hours</p>
                  <p className="text-2xl font-bold text-foreground">{Number(stats.totalHours || 0).toFixed(2)}h</p>
                </div>
                <div className="bg-background p-4 rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Total Billable Value</p>
                  <p className="text-2xl font-bold text-emerald-500">${Number(stats.billableAmount || 0).toFixed(2)}</p>
                </div>
                <div className="bg-background p-4 rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Activity className="w-3.5 h-3.5 text-info" /> Completed Entries</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalEntries || entries.length}</p>
                </div>
              </div>

              {/* Activity Timeline / Entries Table */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Self-Performed Time Logs & Actions</h3>
                
                {entries.length === 0 ? (
                  <div className="text-center py-10 bg-background rounded-xl border border-border text-muted-foreground text-sm">
                    No activity recorded for this specific time range.
                  </div>
                ) : (
                  <div className="border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 text-muted-foreground uppercase border-b border-border">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Date</th>
                          <th className="px-4 py-3 font-semibold">Project / Task</th>
                          <th className="px-4 py-3 font-semibold">Duration</th>
                          <th className="px-4 py-3 font-semibold">Notes / Description</th>
                          <th className="px-4 py-3 font-semibold text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-white dark:bg-[#0F172A]">
                        {entries.map((item: any) => (
                          <tr key={item.id} className="hover:bg-accent transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                              {format(new Date(item.date), 'MMM dd, yyyy')}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-foreground block">{item.project?.name || 'Project'}</span>
                              <span className="text-[10px] text-primary">{item.task?.name || 'General Task'}</span>
                            </td>
                            <td className="px-4 py-3 font-bold text-foreground whitespace-nowrap">
                              {item.duration}h
                            </td>
                            <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate" title={item.description}>
                              {item.description || 'No notes'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                item.approvalStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                item.approvalStatus === 'REJECTED' ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                                'bg-warning/10 text-warning border border-warning/20'
                              }`}>
                                {item.approvalStatus || 'Pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/50 flex justify-end shrink-0">
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all">
            Close Activity Center
          </button>
        </div>

      </div>
    </div>
  );
}
