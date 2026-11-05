'use client';

import React, { useState, useEffect } from 'react';
import { X, Clock, Loader2, Activity, Edit, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { axiosInstance } from '@/lib/axios';

interface LogHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryId: string | null;
}

export const LogHistoryModal = ({ isOpen, onClose, entryId }: LogHistoryModalProps) => {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && entryId) {
      setIsLoading(true);
      axiosInstance.get(`/time-entries/${entryId}`)
        .then(res => setHistory(res.data.data.history || []))
        .catch(err => console.error(err))
        .finally(() => setIsLoading(false));
    } else {
      setHistory([]);
    }
  }, [isOpen, entryId]);

  if (!isOpen) return null;

  const getAuditLogUI = (log: any) => {
    const action = log.action;
    const userName = `${log.user?.firstName || 'User'} ${log.user?.lastName || ''}`;
    
    switch(action) {
      case 'CREATED': return { icon: <Plus className="w-3.5 h-3.5 text-success" />, color: 'bg-success', label: `${userName} created this entry.` };
      case 'UPDATED': return { icon: <Edit className="w-3.5 h-3.5 text-info" />, color: 'bg-info', label: `${userName} edited this entry.` };
      case 'RESUBMITTED': return { icon: <Clock className="w-3.5 h-3.5 text-amber-500" />, color: 'bg-amber-500', label: `${userName} fixed and resubmitted.` };
      case 'FIX_REQUESTED': return { icon: <AlertCircle className="w-3.5 h-3.5 text-destructive" />, color: 'bg-destructive', label: `Manager (${userName}) requested a fix.` };
      case 'APPROVED': return { icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />, color: 'bg-emerald-500', label: `Manager (${userName}) approved the entry.` };
      default: return { icon: <Activity className="w-3.5 h-3.5 text-primary" />, color: 'bg-primary', label: `${userName} updated the entry.` };
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-[20px] w-full max-w-[500px] shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/50 shrink-0 rounded-t-[20px]">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Entry History</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar bg-card relative min-h-[300px]">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : history.length > 0 ? (
            <div className="space-y-4">
              {history.map((log: any) => {
                const ui = getAuditLogUI(log);
                return (
                  <div key={log.id} className="relative pl-6 pb-4 border-l border-border/50 last:border-0 last:pb-0">
                    <div className={`absolute -left-[5px] top-1 w-2 h-2 rounded-full ${ui.color} shadow-sm`}></div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground font-medium mb-1">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(log.createdAt).toLocaleDateString()}
                      </span>
                      <p className="text-sm font-semibold text-foreground leading-tight">{ui.label}</p>
                      {log.details?.reason && (
                        <div className="mt-2 text-[11px] text-destructive font-bold bg-destructive/10 p-2 rounded-md border border-destructive/20">
                          <span className="text-muted-foreground font-normal">Reason: "{log.details.reason}"</span>
                        </div>
                      )}
                      {log.details?.previousDuration !== undefined && log.details?.newDuration !== undefined && log.details?.previousDuration !== log.details?.newDuration && (
                         <div className="mt-2 text-[11px] text-muted-foreground bg-background p-2 rounded-md border border-border">
                            Hours changed: <span className="line-through">{log.details.previousDuration}h</span> &rarr; <span className="text-foreground font-bold">{log.details.newDuration}h</span>
                         </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
              <CheckCircle2 className="w-10 h-10 mb-3 opacity-30 text-success" />
              <p className="text-sm">No history found for this entry.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
