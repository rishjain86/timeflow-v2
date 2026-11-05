'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  MoreHorizontal, 
  Mail, 
  Edit, 
  Trash2,
  ShieldAlert,
  UserCheck,
  Filter,
  Loader2,
  X,
  Ban,
  CheckCircle,
  Users,
  ShieldCheck,
  Activity,
  ChevronDown,
  Clock,
  Briefcase,
  FileSpreadsheet,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { axiosInstance } from '@/lib/axios';
import { useTheme } from 'next-themes';
import { format } from 'date-fns';
import { useOrganization } from '@/features/organizations/api/get-organization'; // 🟢 NEW: Fetched for feature toggling

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

type DateRange = '7d' | '15d' | '1m' | '3m' | '6m' | '1y' | 'all';

// --- Member Activity Modal Component ---
const MemberActivityModal = ({ isOpen, onClose, member }: { isOpen: boolean, onClose: () => void, member: any }) => {
  const [range, setRange] = useState<DateRange>('1m');
  const [activityType, setActivityType] = useState<'ALL' | 'TIME_ENTRIES' | 'BUDGET_REQUESTS'>('ALL'); 

  // 🟢 BULLETPROOF INLINE THEME LOGIC
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const solidModalBg = isDark ? '#0F172A' : '#ffffff';
  const solidHeaderBg = isDark ? '#1E293B' : '#F8FAFC';
  const solidBorder = isDark ? '#334155' : '#e2e8f0';
  const solidInputBg = isDark ? '#1E293B' : '#F1F5F9';
  const solidText = isDark ? '#ffffff' : '#0F172A';

  const { data: activityData, isLoading } = useQuery({
    queryKey: ['member-activity', member?.id, range],
    queryFn: async () => {
      const res = await axiosInstance.get(`/users/${member.id}/activity?range=${range}`);
      return res.data?.data || res.data;
    },
    enabled: isOpen && !!member?.id,
  });

  const combinedActivities = useMemo(() => {
    if (!activityData) return [];
    
    let arr: any[] = [];
    
    const timeEntries = Array.isArray(activityData.timeEntries) ? activityData.timeEntries : [];
    const budgetRequests = Array.isArray(activityData.budgetRequests) ? activityData.budgetRequests : [];

    if (activityType === 'ALL' || activityType === 'TIME_ENTRIES') {
      const logs = timeEntries.map((e: any) => ({ ...e, logType: 'TIME_ENTRY', sortDate: new Date(e.date || e.createdAt) }));
      arr = [...arr, ...logs];
    }
    
    if (activityType === 'ALL' || activityType === 'BUDGET_REQUESTS') {
      const reqs = budgetRequests.map((r: any) => ({ ...r, logType: 'BUDGET_REQUEST', sortDate: new Date(r.createdAt) }));
      arr = [...arr, ...reqs];
    }

    return arr.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
  }, [activityData, activityType]);

  if (!isOpen || !member) return null;

  const stats = activityData?.stats || { totalHours: 0, billableAmount: 0, totalEntries: 0, totalBudgetReqs: 0 };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
      <div className="border rounded-[20px] w-full max-w-[900px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" style={{ backgroundColor: solidModalBg, borderColor: solidBorder, color: solidText }}>
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ backgroundColor: solidHeaderBg, borderColor: solidBorder }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold bg-primary/20 text-primary border border-primary/30 shrink-0">
              {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: solidText }}>{member.firstName} {member.lastName}</h2>
              <p className="text-xs text-muted-foreground">{member.email} • <span className="uppercase text-primary font-semibold">{member.role}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Section */}
        <div className="px-6 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0" style={{ backgroundColor: solidModalBg, borderColor: solidBorder }}>
          
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <Calendar className="w-4 h-4 text-primary" /> Timeframe:
            </span>
            <div className="flex flex-wrap gap-1 p-1 rounded-lg border" style={{ backgroundColor: solidHeaderBg, borderColor: solidBorder }}>
              {(['7d', '15d', '1m', '3m', '6m', '1y', 'all'] as DateRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all uppercase ${
                    range === r ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r === 'all' ? 'Lifetime' : r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <Filter className="w-4 h-4 text-info" /> Activity Type:
            </span>
            <select 
              value={activityType} 
              onChange={(e: any) => setActivityType(e.target.value)}
              className="border text-xs rounded-lg px-3 py-1.5 outline-none focus:border-primary dark:[color-scheme:dark]"
              style={{ backgroundColor: solidInputBg, borderColor: solidBorder, color: solidText }}
            >
              <option value="ALL">All Activities</option>
              <option value="TIME_ENTRIES">Time Logs Only</option>
              <option value="BUDGET_REQUESTS">Budget Requests Only</option>
            </select>
          </div>

        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar" style={{ backgroundColor: solidModalBg }}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-sm">Loading activity timeline...</p>
            </div>
          ) : (
            <>
              {/* Quick Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border" style={{ backgroundColor: solidHeaderBg, borderColor: solidBorder }}>
                  <p className="text-[11px] uppercase text-muted-foreground mb-1 font-bold">Tracked Hours</p>
                  <p className="text-xl font-bold" style={{ color: solidText }}>{Number(stats.totalHours || 0).toFixed(2)}h</p>
                </div>
                <div className="p-4 rounded-xl border" style={{ backgroundColor: solidHeaderBg, borderColor: solidBorder }}>
                  <p className="text-[11px] uppercase text-emerald-400 mb-1 font-bold">Billable Value</p>
                  <p className="text-xl font-bold text-emerald-400">${Number(stats.billableAmount || 0).toFixed(2)}</p>
                </div>
                <div className="p-4 rounded-xl border" style={{ backgroundColor: solidHeaderBg, borderColor: solidBorder }}>
                  <p className="text-[11px] uppercase text-info mb-1 font-bold">Total Logs</p>
                  <p className="text-xl font-bold" style={{ color: solidText }}>{stats.totalEntries || 0}</p>
                </div>
                <div className="bg-warning/10 p-4 rounded-xl border border-warning/30">
                  <p className="text-[11px] uppercase text-warning mb-1 font-bold">Budget Reqs</p>
                  <p className="text-xl font-bold text-warning">{stats.totalBudgetReqs || 0}</p>
                </div>
              </div>

              {/* Combined Timeline Table */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: solidText }}>Detailed Activity Timeline</h3>
                
                {combinedActivities.length === 0 ? (
                  <div className="text-center py-10 rounded-xl border text-muted-foreground text-sm flex flex-col items-center gap-2" style={{ backgroundColor: solidHeaderBg, borderColor: solidBorder }}>
                    <Activity className="w-8 h-8 opacity-20" />
                    No activities recorded for this filter combination.
                  </div>
                ) : (
                  <div className="border rounded-xl overflow-x-auto" style={{ borderColor: solidBorder }}>
                    <table className="w-full text-xs text-left min-w-[700px]">
                      <thead className="text-muted-foreground uppercase border-b" style={{ backgroundColor: solidHeaderBg, borderColor: solidBorder }}>
                        <tr>
                          <th className="px-4 py-3 font-semibold">Date</th>
                          <th className="px-4 py-3 font-semibold">Type</th>
                          <th className="px-4 py-3 font-semibold">Project & Task</th>
                          <th className="px-4 py-3 font-semibold">Hours</th>
                          <th className="px-4 py-3 font-semibold w-[25%]">Description / Reason</th>
                          <th className="px-4 py-3 font-semibold text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ backgroundColor: solidModalBg, borderColor: solidBorder }}>
                        {combinedActivities.map((item: any, idx: number) => {
                          const isTimeLog = item.logType === 'TIME_ENTRY';
                          const status = isTimeLog ? item.approvalStatus : item.status;
                          
                          return (
                            <tr key={`${item.id}-${idx}`} className="hover:bg-accent/50 transition-colors group">
                              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                {format(item.sortDate, 'MMM dd, yyyy')}
                              </td>
                              
                              <td className="px-4 py-3">
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded flex w-fit items-center gap-1 ${
                                  isTimeLog ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-warning/10 text-warning border border-warning/20'
                                }`}>
                                  {isTimeLog ? 'Time Log' : 'Budget Req'}
                                </span>
                              </td>
                              
                              <td className="px-4 py-3">
                                <span className="font-semibold block" style={{ color: solidText }}>{item.project?.name || 'Unknown Project'}</span>
                                {item.task?.name && <span className="text-[10px] text-primary">Task: {item.task.name}</span>}
                              </td>
                              
                              <td className="px-4 py-3 font-bold whitespace-nowrap" style={{ color: solidText }}>
                                {isTimeLog ? `${item.duration}h` : `+${item.requestedHours}h`}
                              </td>
                              
                              <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]" title={item.description || item.reason}>
                                {item.description || item.reason || '-'}
                              </td>
                              
                              <td className="px-4 py-3 text-right">
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                  status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  status === 'REJECTED' ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                                  'bg-accent text-muted-foreground border border-border'
                                }`}>
                                  {status || 'Pending'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end shrink-0" style={{ backgroundColor: solidHeaderBg, borderColor: solidBorder }}>
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all">
            Close Activity Center
          </button>
        </div>

      </div>
    </div>
  );
};

// --- Add Member Modal Component ---
const AddMemberModal = ({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) => {
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', role: 'USER' });
  const [loading, setLoading] = useState(false);

  const { data: currentOrganization } = useOrganization();
  const isHealthcare = currentOrganization?.industryType === 'HEALTHCARE';

  // 🟢 BULLETPROOF INLINE THEME LOGIC
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const solidModalBg = isDark ? '#0F172A' : '#ffffff';
  const solidHeaderBg = isDark ? '#1E293B' : '#F8FAFC';
  const solidBorder = isDark ? '#334155' : '#e2e8f0';
  const solidInputBg = isDark ? '#1E293B' : '#F1F5F9';
  const solidText = isDark ? '#ffffff' : '#0F172A';

  const handleSubmit = async (e?: any) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!formData.firstName || !formData.email || !formData.password) {
      toast.error("Please fill all required fields (*)");
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Creating user...');
    
    try {
      await axiosInstance.post('/users', formData);
      toast.success('Team member added successfully!', { id: loadingToast });
      setFormData({ firstName: '', lastName: '', email: '', password: '', phone: '', role: 'USER' });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add member', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200" style={{ pointerEvents: 'auto' }}>
      <div className="border rounded-[20px] w-full max-w-[450px] shadow-2xl flex flex-col" style={{ backgroundColor: solidModalBg, borderColor: solidBorder, color: solidText }}>
        
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 rounded-t-[20px]" style={{ backgroundColor: solidHeaderBg, borderColor: solidBorder }}>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: solidText }}>
            <Plus className="w-5 h-5 text-primary" /> Manually Add Member
          </h2>
          <button onClick={onClose} disabled={loading} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar rounded-b-[20px]" style={{ backgroundColor: solidModalBg }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">First Name <span className="text-destructive">*</span></label>
              <input type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} disabled={loading} className="w-full text-sm rounded-lg px-3 py-2.5 border outline-none focus:ring-2 focus:ring-primary" style={{ backgroundColor: solidInputBg, borderColor: solidBorder, color: solidText }} placeholder="John" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Last Name</label>
              <input type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} disabled={loading} className="w-full text-sm rounded-lg px-3 py-2.5 border outline-none focus:ring-2 focus:ring-primary" style={{ backgroundColor: solidInputBg, borderColor: solidBorder, color: solidText }} placeholder="Doe" />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Email Address <span className="text-destructive">*</span></label>
            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} disabled={loading} className="w-full text-sm rounded-lg px-3 py-2.5 border outline-none focus:ring-2 focus:ring-primary" style={{ backgroundColor: solidInputBg, borderColor: solidBorder, color: solidText }} placeholder="email@company.com" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
            <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} disabled={loading} className="w-full text-sm rounded-lg px-3 py-2.5 border outline-none focus:ring-2 focus:ring-primary" style={{ backgroundColor: solidInputBg, borderColor: solidBorder, color: solidText }} placeholder="+1234567890" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Temporary Password <span className="text-destructive">*</span></label>
            <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} disabled={loading} className="w-full text-sm rounded-lg px-3 py-2.5 border outline-none focus:ring-2 focus:ring-primary" style={{ backgroundColor: solidInputBg, borderColor: solidBorder, color: solidText }} placeholder="Enter password" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Assign Role <span className="text-destructive">*</span></label>
            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} disabled={loading} className="w-full text-sm rounded-lg px-3 py-2.5 border outline-none focus:ring-2 focus:ring-primary dark:[color-scheme:dark]" style={{ backgroundColor: solidInputBg, borderColor: solidBorder, color: solidText }}>
              <option value="SUPER_ADMIN">Super Admin (Full System Access)</option>
              <option value="ADMIN">Admin (Full Access)</option>
              <option value="MANAGER">Manager</option>
              <option value="THERAPIST">Therapist</option>
              <option value="CONSULTANT">Consultant</option>
              <option value="BILLING">Billing</option>
              <option value="FRONT_DESK">Front Desk</option>
              <option value="EMPLOYEE">Employee (Limited Access)</option>
              <option value="USER">Standard User</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3 relative z-[50]">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 rounded-[12px] text-sm font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50">Cancel</button>
            <button 
              type="button" 
              onClick={handleSubmit} 
              onTouchEnd={handleSubmit}
              disabled={loading} 
              className="btn-primary py-2 px-5 shadow-md disabled:opacity-50 relative z-[99999] pointer-events-auto"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create User'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// --- Invite Member Modal ---
const InviteMemberModal = ({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) => {
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', role: 'USER' });
  const [loading, setLoading] = useState(false);

  const { data: currentOrganization } = useOrganization();
  const isHealthcare = currentOrganization?.industryType === 'HEALTHCARE';

  // 🟢 BULLETPROOF INLINE THEME LOGIC
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const solidModalBg = isDark ? '#0F172A' : '#ffffff';
  const solidHeaderBg = isDark ? '#1E293B' : '#F8FAFC';
  const solidBorder = isDark ? '#334155' : '#e2e8f0';
  const solidInputBg = isDark ? '#1E293B' : '#F1F5F9';
  const solidText = isDark ? '#ffffff' : '#0F172A';

  const handleSubmit = async (e?: any) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!formData.firstName || !formData.email) {
      toast.error("First Name and Email are required");
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Sending invite...');
    
    try {
      await axiosInstance.post('/auth/invite', formData);
      toast.success('Invite sent successfully!', { id: loadingToast });
      setFormData({ firstName: '', lastName: '', email: '', role: 'USER' });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send invite', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200" style={{ pointerEvents: 'auto' }}>
      <div className="border rounded-[20px] w-full max-w-[450px] shadow-2xl flex flex-col" style={{ backgroundColor: solidModalBg, borderColor: solidBorder, color: solidText }}>
        
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 rounded-t-[20px]" style={{ backgroundColor: solidHeaderBg, borderColor: solidBorder }}>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: solidText }}>
            <Mail className="w-5 h-5 text-primary" /> Invite Team Member
          </h2>
          <button onClick={onClose} disabled={loading} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4 rounded-b-[20px]" style={{ backgroundColor: solidModalBg }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">First Name <span className="text-destructive">*</span></label>
              <input type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} disabled={loading} className="w-full text-sm rounded-lg px-3 py-2.5 border outline-none focus:ring-2 focus:ring-primary" style={{ backgroundColor: solidInputBg, borderColor: solidBorder, color: solidText }} placeholder="John" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Last Name</label>
              <input type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} disabled={loading} className="w-full text-sm rounded-lg px-3 py-2.5 border outline-none focus:ring-2 focus:ring-primary" style={{ backgroundColor: solidInputBg, borderColor: solidBorder, color: solidText }} placeholder="Doe" />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Email Address <span className="text-destructive">*</span></label>
            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} disabled={loading} className="w-full text-sm rounded-lg px-3 py-2.5 border outline-none focus:ring-2 focus:ring-primary" style={{ backgroundColor: solidInputBg, borderColor: solidBorder, color: solidText }} placeholder="email@company.com" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Assign Role <span className="text-destructive">*</span></label>
            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} disabled={loading} className="w-full text-sm rounded-lg px-3 py-2.5 border outline-none focus:ring-2 focus:ring-primary dark:[color-scheme:dark]" style={{ backgroundColor: solidInputBg, borderColor: solidBorder, color: solidText }}>
              <option value="SUPER_ADMIN">Super Admin (Full System Access)</option>
              <option value="ADMIN">Admin (Full Access)</option>
              <option value="MANAGER">Manager</option>
              <option value="THERAPIST">Therapist</option>
              <option value="CONSULTANT">Consultant</option>
              <option value="BILLING">Billing</option>
              <option value="FRONT_DESK">Front Desk</option>
              <option value="EMPLOYEE">Employee (Limited Access)</option>
              <option value="USER">Standard User</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3 relative z-[50]">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 rounded-[12px] text-sm font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50">Cancel</button>
            <button 
              type="button" 
              onClick={handleSubmit} 
              onTouchEnd={handleSubmit}
              disabled={loading} 
              className="btn-primary py-2 px-5 shadow-md disabled:opacity-50 relative z-[99999] pointer-events-auto"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Invite'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// --- Edit & Manage Member Modal ---
const EditMemberModal = ({ isOpen, onClose, onSuccess, member }: { isOpen: boolean, onClose: () => void, onSuccess: () => void, member: any }) => {
  const [formData, setFormData] = useState({ role: 'USER', isActive: true, isBanned: false, canManageImports: false });
  const [loading, setLoading] = useState(false);

  // 🟢 BULLETPROOF INLINE THEME LOGIC
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
    if (member) {
      setFormData({
        role: member.role || 'USER',
        isActive: member.isActive !== false,
        isBanned: member.isBanned === true,
        canManageImports: member.canManageImports === true
      });
    }
  }, [member]);

  const handleSubmit = async (e?: any) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setLoading(true);
    const loadingToast = toast.loading('Updating user profile...');
    
    try {
      await axiosInstance.patch(`/users/${member.id}`, formData);
      toast.success('User updated successfully!', { id: loadingToast });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update user', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200" style={{ pointerEvents: 'auto' }}>
      <div className="border rounded-[20px] w-full max-w-[450px] shadow-2xl flex flex-col max-h-[90vh]" style={{ backgroundColor: solidModalBg, borderColor: solidBorder, color: solidText }}>
        
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 rounded-t-[20px]" style={{ backgroundColor: solidHeaderBg, borderColor: solidBorder }}>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: solidText }}>
            <Edit className="w-5 h-5 text-primary" /> Edit User Access
          </h2>
          <button onClick={onClose} disabled={loading} className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar rounded-b-[20px]" style={{ backgroundColor: solidModalBg }}>
          
          <div className="p-4 rounded-xl border" style={{ backgroundColor: solidHeaderBg, borderColor: solidBorder }}>
            <p className="text-sm font-bold" style={{ color: solidText }}>{member.firstName} {member.lastName}</p>
            <p className="text-xs text-muted-foreground">{member.email}</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Change Role</label>
            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} disabled={loading} className="w-full text-sm rounded-lg px-3 py-2.5 border outline-none focus:ring-2 focus:ring-primary dark:[color-scheme:dark]" style={{ backgroundColor: solidInputBg, borderColor: solidBorder, color: solidText }}>
              <option value="SUPER_ADMIN">Super Admin (Full System Access)</option>
              <option value="ADMIN">Admin (Full Access)</option>
              <option value="MANAGER">Manager</option>
              <option value="THERAPIST">Therapist</option>
              <option value="CONSULTANT">Consultant</option>
              <option value="BILLING">Billing</option>
              <option value="FRONT_DESK">Front Desk</option>
              <option value="EMPLOYEE">Employee (Limited Access)</option>
              <option value="USER">Standard User</option>
            </select>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition-colors" style={{ backgroundColor: solidHeaderBg, borderColor: solidBorder }}>
              <input 
                type="checkbox" 
                checked={formData.canManageImports} 
                onChange={e => setFormData({...formData, canManageImports: e.target.checked})} 
                className="w-4 h-4 rounded text-primary bg-background border-border cursor-pointer" 
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-primary flex items-center gap-1"><FileSpreadsheet className="w-3.5 h-3.5" /> Allow Data Import/Export</span>
                <span className="text-xs text-muted-foreground mt-0.5">Grants temporary capability to import/export system data regardless of role.</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition-colors" style={{ backgroundColor: solidHeaderBg, borderColor: solidBorder }}>
              <input 
                type="checkbox" 
                checked={formData.isActive} 
                onChange={e => setFormData({...formData, isActive: e.target.checked, isBanned: e.target.checked ? false : formData.isBanned})} 
                className="w-4 h-4 rounded text-primary bg-background border-border cursor-pointer" 
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold flex items-center gap-1" style={{ color: solidText }}><CheckCircle className="w-3.5 h-3.5 text-success" /> Active Account</span>
                <span className="text-xs text-muted-foreground mt-0.5">Allow this user to login and access the system.</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-destructive/30 bg-destructive/5 transition-colors">
              <input 
                type="checkbox" 
                checked={formData.isBanned} 
                onChange={e => setFormData({...formData, isBanned: e.target.checked, isActive: e.target.checked ? false : formData.isActive})} 
                className="w-4 h-4 rounded text-destructive bg-background border-border cursor-pointer" 
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-rose-500 flex items-center gap-1"><Ban className="w-3.5 h-3.5" /> Banned / Locked</span>
                <span className="text-xs text-rose-500/70 mt-0.5">Permanently block this user and move to the Archived tab.</span>
              </div>
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-3 relative z-[50]">
            <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 rounded-[12px] text-sm font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50">Cancel</button>
            <button 
              type="button" 
              onClick={handleSubmit} 
              onTouchEnd={handleSubmit}
              disabled={loading} 
              className="btn-primary py-2 px-5 shadow-md disabled:opacity-50 relative z-[99999] pointer-events-auto"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};


// --- Main Page Component ---
export default function TeamPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL'); 
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [selectedMemberForActivity, setSelectedMemberForActivity] = useState<any>(null);

  const { data: currentOrganization } = useOrganization();
  const isHealthcare = currentOrganization?.industryType === 'HEALTHCARE';

  // 🟢 DASHBOARD WALI TRICK
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const solidMenuBg = isDark ? '#1E293B' : '#ffffff';
  const solidText = isDark ? '#ffffff' : '#0F172A';

  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const res = await axiosInstance.get('/users'); 
      return res.data;
    }
  });

  const teamMembers = getSafeArray(usersData, 'users', 'data');

  const stats = useMemo(() => {
    let totalTracked = 0;
    let activeMembersCount = 0;
    let adminsCount = 0;

    teamMembers.forEach((m: any) => {
      if (m.isActive && !m.isBanned) {
        activeMembersCount++;
        totalTracked += (m.weeklyStats?.trackedHours || 0);
      }
      if (m.role === 'SUPER_ADMIN' || m.role === 'ADMIN' || m.role === 'MANAGER') {
        adminsCount++;
      }
    });

    const totalWeeklyCapacity = activeMembersCount * 40;
    const teamOptimalPercentage = totalWeeklyCapacity > 0 ? Math.round((totalTracked / totalWeeklyCapacity) * 100) : 0;

    return { 
      total: teamMembers.length, 
      active: activeMembersCount, 
      admins: adminsCount,
      teamPercentage: teamOptimalPercentage
    };
  }, [teamMembers]);

  const tabFilteredMembers = teamMembers.filter((member: any) => {
    if (activeTab === 'ACTIVE') return !member.isBanned;
    return member.isBanned === true;
  });

  const filteredMembers = tabFilteredMembers.filter((member: any) => {
    const matchesSearch = `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) || member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const memberRole = member.role || 'USER';
    const matchesRole = roleFilter === 'ALL' || memberRole === roleFilter;
      
    return matchesSearch && matchesRole;
  });

  const getInitials = (first: string, last: string) => {
    return `${(first || 'U').charAt(0)}${(last || '').charAt(0)}`.toUpperCase();
  };

  const getRoleColor = (role: string) => {
    const r = role?.toUpperCase() || 'USER';
    switch(r) {
      case 'SUPER_ADMIN': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'ADMIN': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'MANAGER': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'THERAPIST': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      case 'CONSULTANT': return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
      case 'BILLING': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'FRONT_DESK': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'EMPLOYEE': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if(window.confirm(`Are you sure you want to remove and lock ${name} from the system? They will be moved to the Archived tab.`)) {
      try {
        await axiosInstance.delete(`/users/${userId}`);
        toast.success('User locked and archived successfully');
        refetch();
      } catch (error) {
        toast.error('Failed to remove user');
      }
    }
  };

  return (
    <div className="timeflow-container space-y-6 animate-in fade-in duration-500 py-6">
        
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {isHealthcare ? 'Staff & Therapist Center' : 'Team Command Center'}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage roles, track live capacity, and monitor team performance in real-time.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={() => setIsInviteModalOpen(true)} className="btn-secondary shrink-0 w-full sm:w-auto">
            <Mail className="w-4 h-4 mr-2" /> Invite Member
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="btn-primary shrink-0 w-full sm:w-auto shadow-md">
            <Plus className="w-4 h-4 mr-2" /> Manually Add
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="enterprise-card group hover:border-primary/50 transition-colors flex items-start gap-4">
          <div className="p-3 bg-[#3B82F6]/20 text-[#3B82F6] rounded-xl group-hover:bg-[#3B82F6] group-hover:text-white transition-colors">
            <Users className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Active Members</p>
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mt-2 text-[#3B82F6]" /> : (
              <h3 className="text-2xl font-bold text-foreground mt-1 tracking-tight">{stats.active} <span className="text-sm text-muted-foreground font-medium">/ {stats.total} Total</span></h3>
            )}
          </div>
        </div>

        <div className="enterprise-card group hover:border-emerald-500/50 transition-colors flex items-start gap-4">
          <div className="p-3 bg-[#22C55E]/20 text-[#22C55E] rounded-xl group-hover:bg-[#22C55E] group-hover:text-white transition-colors">
            <Activity className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Team Optimal Capacity</p>
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mt-2 text-[#22C55E]" /> : (
              <h3 className="text-2xl font-bold text-foreground mt-1 tracking-tight">{stats.teamPercentage}%</h3> 
            )}
          </div>
        </div>

        <div className="enterprise-card group hover:border-primary/50 transition-colors flex items-start gap-4">
          <div className="p-3 bg-rose-500/20 text-rose-500 rounded-xl group-hover:bg-rose-500 group-hover:text-white transition-colors">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Admins & Managers</p>
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mt-2 text-rose-500" /> : (
              <h3 className="text-2xl font-bold text-foreground mt-1 tracking-tight">{stats.admins}</h3>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 border-b border-border mt-4">
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === 'ACTIVE' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Active Members
          {activeTab === 'ACTIVE' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full shadow-md"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('ARCHIVED')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === 'ARCHIVED' ? 'text-rose-500' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Archived & Locked
          {activeTab === 'ARCHIVED' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-500 rounded-t-full shadow-md"></span>
          )}
        </button>
      </div>

      <div className="enterprise-card p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Search by name, email..." 
            className="input-field pl-9 bg-background text-foreground border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
          
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* 🟢 NATIVE SELECT MENU FOR FILTERS */}
          <div className="relative flex items-center w-full sm:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="btn-secondary w-full sm:w-auto appearance-none cursor-pointer pr-10 dark:[color-scheme:dark]"
            >
              <option value="ALL" style={{ backgroundColor: solidMenuBg, color: solidText }}>Filter Roles</option>
              <option value="SUPER_ADMIN" style={{ backgroundColor: solidMenuBg, color: solidText }}>Super Admin</option>
              <option value="ADMIN" style={{ backgroundColor: solidMenuBg, color: solidText }}>Admin</option>
              <option value="MANAGER" style={{ backgroundColor: solidMenuBg, color: solidText }}>Manager</option>
              <option value="THERAPIST" style={{ backgroundColor: solidMenuBg, color: solidText }}>Therapist</option>
              <option value="CONSULTANT" style={{ backgroundColor: solidMenuBg, color: solidText }}>Consultant</option>
              <option value="BILLING" style={{ backgroundColor: solidMenuBg, color: solidText }}>Billing</option>
              <option value="FRONT_DESK" style={{ backgroundColor: solidMenuBg, color: solidText }}>Front Desk</option>
              <option value="EMPLOYEE" style={{ backgroundColor: solidMenuBg, color: solidText }}>Employee</option>
            </select>
            <ChevronDown className="w-4 h-4 opacity-50 absolute right-4 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="enterprise-table-container overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="enterprise-table-header">
              <tr>
                <th className="enterprise-table-head w-[25%] pl-6">Member</th>
                <th className="enterprise-table-head w-[15%]">Live Status</th>
                <th className="enterprise-table-head w-[35%]">Weekly Capacity (40h)</th>
                <th className="enterprise-table-head w-[15%]">System Role</th>
                <th className="enterprise-table-head text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="h-32 text-center bg-background">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50 text-primary" />
                    <p className="text-xs text-muted-foreground mt-2 opacity-50">Syncing Command Center...</p>
                  </td>
                </tr>
              ) : filteredMembers.length > 0 ? (
                filteredMembers.map((member: any) => {
                  const tracked = member.weeklyStats?.trackedHours || 0;
                  const billableHours = member.weeklyStats?.billableHours || 0;
                  const isLive = member.isActive && !member.isBanned && (member.weeklyStats?.loggedToday || false);
                   
                  const capacity = 40;
                  const percentage = Math.round((tracked / capacity) * 100);
                  const billablePercent = tracked > 0 ? Math.round((billableHours / tracked) * 100) : 0;
                  const opsPercent = tracked > 0 ? 100 - billablePercent : 0;
                   
                  let colorClass = 'from-blue-500 to-indigo-500';
                  if (percentage > 95) colorClass = 'from-rose-500 to-red-600';
                  else if (percentage < 40 && percentage > 0) colorClass = 'from-amber-400 to-orange-500';
                  else if (percentage >= 40 && percentage <= 95) colorClass = 'from-emerald-400 to-teal-500';
                   
                  return (
                    <tr key={member.id} className={`enterprise-table-row group border-b border-border/50 ${member.isBanned ? 'opacity-60 grayscale hover:grayscale-0' : ''}`}>
                        
                      <td className="enterprise-table-cell pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`relative h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-sm font-bold border ${getRoleColor(member.role)}`}>
                            {getInitials(member.firstName, member.lastName)}
                            {isLive && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-card shadow-md animate-pulse"></span>}
                          </div>
                          <div>
                            <p 
                              onClick={() => setSelectedMemberForActivity(member)}
                              className="font-semibold text-foreground hover:text-primary transition-colors cursor-pointer truncate max-w-[200px]"
                            >
                              {member.firstName} {member.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate max-w-[200px]">{member.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="enterprise-table-cell py-4">
                        {member.isBanned ? (
                          <span className="badge-base bg-destructive/10 text-destructive border-destructive/20"><Ban className="w-3 h-3 mr-1" /> Banned</span>
                        ) : !member.isActive ? (
                          <span className="badge-base badge-cancelled">Inactive</span>
                        ) : isLive ? (
                           <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md w-max border border-emerald-500/20">
                               <Clock className="w-3.5 h-3.5" /> Working
                           </div>
                        ) : (
                           <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground w-max">
                               <Briefcase className="w-3.5 h-3.5 opacity-60" /> Offline
                           </div>
                        )}
                      </td>

                      <td className="enterprise-table-cell py-4 pr-8">
                        {!member.isBanned && member.isActive ? (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium text-foreground">{tracked}h / {capacity}h</span>
                              <span className="text-muted-foreground">{percentage}%</span>
                            </div>
                            <div className="w-full bg-background rounded-full h-2 border border-border/50 overflow-hidden">
                              <div 
                                className={`h-full rounded-full bg-gradient-to-r ${colorClass} transition-all duration-1000 ease-in-out`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                            <div className="flex gap-3 text-[10px] font-medium">
                              <span className="text-emerald-400">💰 {billablePercent}% Billable</span>
                              <span className="text-muted-foreground">⚙️ {opsPercent}% Ops</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">- Account Locked -</span>
                        )}
                      </td>

                      <td className="enterprise-table-cell py-4">
                        <div className="flex items-center gap-2">
                          {(member.role === 'SUPER_ADMIN' || member.role === 'ADMIN') && <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                          <span className="font-medium text-muted-foreground capitalize">
                            {member.role === 'USER' ? 'Employee' : member.role?.toLowerCase().replace('_', ' ')}
                          </span>
                        </div>
                      </td>

                      <td className="enterprise-table-cell text-right pr-6 py-4">
                        <div className="relative flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent transition-colors float-right">
                          <MoreHorizontal className="absolute w-4 h-4 text-muted-foreground pointer-events-none" style={{ zIndex: 1 }} />
                          <select
                            title="Actions"
                            className="absolute inset-0 w-full h-full cursor-pointer dark:[color-scheme:dark]"
                            style={{ opacity: 0, appearance: 'none', WebkitAppearance: 'none', zIndex: 10 }}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'edit') setEditingMember(member);
                              if (val === 'delete') handleDeleteUser(member.id, member.firstName);
                              e.target.value = 'default';
                            }}
                            defaultValue="default"
                          >
                            <option value="default" disabled hidden>⚙️ Actions</option>
                            <option value="edit" style={{ backgroundColor: solidMenuBg, color: solidText }}>✏️ Edit Profile</option>
                            <option value="delete" style={{ backgroundColor: solidMenuBg, color: solidText }}>
                              {member.isBanned ? '🗑️ Delete Permanently' : '📦 Lock & Archive'}
                            </option>
                          </select>
                        </div>
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="h-32 text-center text-muted-foreground bg-background">
                    <UserCheck className="w-6 h-6 mb-2 opacity-50 mx-auto" />
                    <p>No team members found in {activeTab === 'ACTIVE' ? 'Active' : 'Archive'} list.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
          
        <div className="p-4 border-t border-border bg-card flex items-center justify-between text-sm text-muted-foreground rounded-b-[12px]">
          <span className="font-medium">Showing {filteredMembers.length} {activeTab === 'ACTIVE' ? 'active' : 'archived'} members</span>
        </div>
      </div>

      <AddMemberModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={refetch}
      />

      <InviteMemberModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
        onSuccess={refetch}
      />

      <EditMemberModal 
        isOpen={!!editingMember} 
        onClose={() => setEditingMember(null)} 
        onSuccess={refetch}
        member={editingMember}
      />

      <MemberActivityModal
        isOpen={!!selectedMemberForActivity}
        onClose={() => setSelectedMemberForActivity(null)}
        member={selectedMemberForActivity}
      />

    </div>
  );
}
