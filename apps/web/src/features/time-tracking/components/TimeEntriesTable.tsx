'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { FileText, Paperclip, Loader2, CheckCircle2, ArrowRightLeft, X, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { useTimeEntries } from '../api/get-time-entries';
import { useMoveTimeEntry } from '../api/move-time-entry'; 
import { useUser } from '@/features/auth/api/get-current-user'; 

export const TimeEntriesTable = ({ projectId }: { projectId?: string }) => {
  const { data: entries, isLoading } = useTimeEntries({ projectId });
  const { data: currentUser } = useUser(); 
  
  const [entryToMove, setEntryToMove] = useState<any>(null);
  const [unlockedEntries, setUnlockedEntries] = useState<string[]>([]);

  // 🟢 FAIL-SAFE USER ROLE EXTRACTION (Handles all nested formats)
  const rawRole = currentUser?.role || currentUser?.user?.role || currentUser?.data?.role || currentUser?.data?.user?.role || '';
  const userRole = String(rawRole).toUpperCase();
  const isManagerOrAdmin = userRole === 'MANAGER' || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  if (isLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (!entries || entries.length === 0) {
    return <div className="text-center p-8 text-muted-foreground bg-card border border-border rounded-xl">No time entries found.</div>;
  }

  const toggleUnlock = (id: string) => {
    setUnlockedEntries(prev => 
      prev.includes(id) ? prev.filter(entryId => entryId !== id) : [...prev, id]
    );
  };

  return (
    <>
      <div className="w-full overflow-x-auto bg-card border border-border rounded-xl shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-[#0F172A] border-b border-border">
            <tr>
              <th className="px-6 py-4 font-semibold">Date</th>
              <th className="px-6 py-4 font-semibold">Team Member</th>
              <th className="px-6 py-4 font-semibold">Task</th>
              <th className="px-6 py-4 font-semibold">Duration</th>
              <th className="px-6 py-4 font-semibold">Compliance Docs</th>
              <th className="px-6 py-4 font-semibold text-right">Status</th>
              <th className="px-6 py-4 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.map((entry: any) => {
              // 🟢 FAIL-SAFE STATUS CHECK (Checks approvalStatus & fallback status)
              const statusStr = String(entry.approvalStatus || entry.status || '').toUpperCase();
              const isApproved = statusStr === 'APPROVED';
              const isTemporarilyUnlocked = unlockedEntries.includes(entry.id);
              const isLockedForAction = isApproved && !isTemporarilyUnlocked;

              return (
              <tr key={entry.id} className={`hover:bg-[#0F172A]/50 transition-colors ${isLockedForAction ? 'opacity-80' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap text-[#CBD5E1]">
                  {format(new Date(entry.date), 'MMM dd, yyyy')}
                  {isApproved && <span className="ml-2 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase">Approved</span>}
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-white">
                    {entry.user?.firstName} {entry.user?.lastName}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[#CBD5E1]">{entry.task?.name || 'General Task'}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-bold text-white">{entry.duration}h</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {entry.cnrDocumentUrl ? (
                      <a 
                        href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/${entry.cnrDocumentUrl}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline bg-primary/10 px-2.5 py-1.5 rounded-md transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" /> CNR
                      </a>
                    ) : null}

                    {entry.attendanceDocumentUrl ? (
                      <a 
                        href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/${entry.attendanceDocumentUrl}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:underline bg-emerald-500/10 px-2.5 py-1.5 rounded-md transition-colors"
                      >
                        <Paperclip className="w-3.5 h-3.5" /> Attendance
                      </a>
                    ) : null}

                    {!entry.cnrDocumentUrl && !entry.attendanceDocumentUrl && (
                      <span className="text-xs text-muted-foreground italic">No docs attached</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1.5 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Logged</span>
                  </div>
                </td>
                
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {isLockedForAction ? (
                      /* IF LOCKED */
                      isManagerOrAdmin ? (
                        <button
                          onClick={() => toggleUnlock(entry.id)}
                          className="p-1.5 inline-flex items-center justify-center text-amber-400 hover:bg-amber-400/10 rounded-md transition-all border border-amber-400/30 text-xs gap-1 font-medium"
                          title="Click to Temporarily Unlock"
                        >
                          <Lock className="w-3.5 h-3.5" /> Unlock
                        </button>
                      ) : (
                        <span className="p-1.5 inline-flex items-center text-muted-foreground opacity-60 cursor-not-allowed gap-1 text-xs">
                          <Lock className="w-4 h-4 text-amber-400" title="Approved & Locked" /> Locked
                        </span>
                      )
                    ) : (
                      /* IF UNLOCKED / EDITABLE */
                      <>
                        <button
                          onClick={() => setEntryToMove({ ...entry, isOverride: isTemporarilyUnlocked })}
                          className="p-2 inline-flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                          title="Move Time Entry to another Project/Task"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>

                        {isTemporarilyUnlocked && (
                          <button
                            onClick={() => toggleUnlock(entry.id)}
                            className="p-1.5 inline-flex items-center justify-center text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-all border border-emerald-500/30"
                            title="Lock again"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      {/* The Move Modal */}
      {entryToMove && (
        <MoveTimeEntryModal 
          entry={entryToMove} 
          onClose={() => setEntryToMove(null)} 
        />
      )}
    </>
  );
};

// ============================================================================
// Modal Component
// ============================================================================
const MoveTimeEntryModal = ({ entry, onClose }: { entry: any, onClose: () => void }) => {
  const [newProjectId, setNewProjectId] = useState(entry.projectId || '');
  const [newTaskId, setNewTaskId] = useState(entry.taskId || '');
  const [reason, setReason] = useState('');
  
  const [cnrFile, setCnrFile] = useState<File | null>(null);
  const [attendanceFile, setAttendanceFile] = useState<File | null>(null);

  const [error, setError] = useState('');

  const { mutate: moveEntry, isPending: isSubmitting } = useMoveTimeEntry();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    moveEntry(
      {
        id: entry.id,
        newProjectId,
        newTaskId: newTaskId || null,
        reason,
        cnrDocument: cnrFile,
        attendanceDocument: attendanceFile,
        isManagerOverride: entry.isOverride || false
      },
      {
        onSuccess: () => {
          alert('Time entry moved successfully!');
          onClose();
        },
        onError: (err: any) => {
          setError(err.response?.data?.message || err.message || 'Failed to move time entry');
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0F172A] border border-border w-full max-w-md rounded-xl shadow-2xl overflow-y-auto max-h-[95vh]">
        <div className="sticky top-0 bg-[#0F172A] z-10 flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-primary" /> Move Time Entry
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Original Entry</label>
            <div className="p-3 bg-black/20 rounded-lg text-sm text-[#CBD5E1] border border-border/50">
              <span className="block text-white font-medium">{entry.duration} hours</span>
              <span className="block opacity-75 mt-1">From: {entry.project?.name || 'Current Project'}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#CBD5E1]">New Project ID <span className="text-red-400">*</span></label>
            <input 
              required
              type="text"
              placeholder="Paste new Project UUID here"
              value={newProjectId}
              onChange={(e) => setNewProjectId(e.target.value)}
              className="w-full bg-black/40 border border-border text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#CBD5E1]">New Task ID (Optional)</label>
            <input 
              type="text"
              placeholder="Paste new Task UUID here (optional)"
              value={newTaskId}
              onChange={(e) => setNewTaskId(e.target.value)}
              className="w-full bg-black/40 border border-border text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#CBD5E1]">Reason for Moving</label>
            <textarea 
              placeholder="E.g., Logged to wrong project by mistake"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-black/40 border border-border text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-primary min-h-[60px]"
            />
          </div>

          {/* COMPLIANCE UPLOAD SECTION */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
            <h4 className="text-xs font-semibold text-primary uppercase tracking-wide">Missing Compliance? (Optional)</h4>
            <p className="text-xs text-muted-foreground">If target task requires compliance, attach missing documents here to complete the move.</p>
            
            <div className="space-y-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[#CBD5E1]">Clinical Notes (CNR)</label>
                <input 
                  type="file" 
                  accept="application/pdf,.doc,.docx,image/*"
                  onChange={(e) => setCnrFile(e.target.files?.[0] || null)}
                  className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[#CBD5E1]">Attendance Sheet</label>
                <input 
                  type="file" 
                  accept="application/pdf,.doc,.docx,image/*"
                  onChange={(e) => setAttendanceFile(e.target.files?.[0] || null)}
                  className="text-xs text-muted-foreground file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3 pb-2">
            <button 
              type="button" 
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-transparent border border-border hover:bg-border/50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || !newProjectId}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
              {isSubmitting ? 'Moving...' : 'Move Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
