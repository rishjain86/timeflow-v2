'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Loader2, 
  X, 
  AlertCircle,
  Briefcase,
  DownloadCloud,
  FileText
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { axiosInstance } from '@/lib/axios';
import { useAuthUser } from '@/features/auth/api/get-auth-user';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const backendDomain = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/api\/v1\/?$/, '');

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

const RejectModal = ({ isOpen, onClose, onSuccess, entry, apiEndpoint }: { isOpen: boolean, onClose: () => void, onSuccess: () => void, entry: any, apiEndpoint: string }) => {
  const [reason, setReason] = useState('');
  const [isPermanent, setIsPermanent] = useState(false); // 🟢 ADDED: Permanent Lock State
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setIsPermanent(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e?: React.MouseEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    
    if (!reason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Rejecting request...');
    
    try {
      await axiosInstance.patch(apiEndpoint, { 
        approvalStatus: 'REJECTED',
        status: 'REJECTED', 
        rejectionReason: reason.trim(),
        reason: reason.trim(),
        isPermanent // 🟢 Sending Lock Status to Backend
      });
      
      toast.success(isPermanent ? 'Entry permanently rejected & locked!' : 'Rejected successfully!', { id: loadingToast });
      setReason('');
      setIsPermanent(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Reject Error:", err);
      toast.error(err.response?.data?.message || 'Failed to reject request', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (e?: React.MouseEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    onClose();
  };

  if (!isOpen || !entry) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-[20px] w-full max-w-[500px] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0 rounded-t-[20px]">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <XCircle className="w-5 h-5 text-destructive" /> Reject Request
          </h2>
          <button 
            type="button"
            onClick={handleClose} 
            disabled={loading} 
            className="p-2 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50 touch-manipulation"
          >
            <X className="w-5 h-5 pointer-events-none" />
          </button>
        </div>
        
        <div className="p-6 space-y-5 bg-card">
          <div className="bg-background p-4 rounded-xl border border-destructive/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-destructive"></div>
            <p className="text-sm font-bold text-foreground mb-1">
              {entry.user?.firstName} {entry.user?.lastName}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> 
              {entry.duration 
                ? `${Number(entry.duration).toFixed(2)} Hours time log` 
                : `${Number(entry.requestedHours).toFixed(2)} Extra Hours requested`}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Reason for Rejection *</label>
            <textarea 
              value={reason} 
              onChange={e => setReason(e.target.value)} 
              disabled={loading} 
              className="input-field min-h-[100px] resize-none py-3 bg-background text-foreground border-border" 
              placeholder="State the reason..." 
            />
          </div>

          {/* 🟢 NEW UI: PERMANENT REJECT CHECKBOX */}
          <label className="flex items-start gap-3 mt-4 p-3 bg-destructive/5 border border-destructive/20 rounded-xl cursor-pointer hover:bg-destructive/10 transition-colors">
            <input 
              type="checkbox" 
              checked={isPermanent} 
              onChange={e => setIsPermanent(e.target.checked)} 
              disabled={loading}
              className="mt-0.5 w-4 h-4 rounded border-destructive/30 text-destructive focus:ring-destructive cursor-pointer" 
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-destructive">Permanent Reject (Lock Entry)</span>
              <span className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Check this if the entry has been rejected multiple times. The employee will not be able to edit or resubmit this log again.
              </span>
            </div>
          </label>

          <div className="pt-4 flex flex-col md:flex-row justify-end gap-3">
            <button 
              type="button" 
              onClick={handleClose} 
              disabled={loading} 
              className="px-4 py-3 md:py-2 min-h-[44px] rounded-[12px] text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50 touch-manipulation"
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={handleSubmit} 
              disabled={loading} 
              className="btn-primary bg-destructive hover:bg-destructive/90 text-white py-3 px-5 md:py-2 min-h-[44px] shadow-md disabled:opacity-50 touch-manipulation flex items-center justify-center"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ApprovalsPage() {
  const router = useRouter();
  const { data: user, isLoading: isUserLoading } = useAuthUser();

  const [viewMode, setViewMode] = useState<'TIME_ENTRIES' | 'BUDGET_REQUESTS'>('TIME_ENTRIES');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [isZipping, setIsZipping] = useState(false);

  const { data: entriesData, isLoading: isLoadingEntries, refetch: refetchEntries } = useQuery({
    queryKey: ['manager-approvals', activeTab],
    queryFn: async () => {
      const res = await axiosInstance.get(`/time-entries?approvalStatus=${activeTab}&limit=50`); 
      return res.data;
    },
    enabled: !!user && ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role) && viewMode === 'TIME_ENTRIES'
  });

  const { data: budgetData, isLoading: isLoadingBudgets, refetch: refetchBudgets } = useQuery({
    queryKey: ['budget-requests', activeTab],
    queryFn: async () => {
      const res = await axiosInstance.get(`/projects/budget-requests/all?status=${activeTab}&limit=50`); 
      return res.data;
    },
    enabled: !!user && ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role) && viewMode === 'BUDGET_REQUESTS'
  });

  useEffect(() => {
    if (!isUserLoading) {
      if (!user || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
        toast.error("Access Denied: Restricted to Admins and Managers.");
        router.replace('/dashboard');
      }
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Verifying security permissions...</p>
      </div>
    );
  }

  if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] bg-background text-center p-6">
        <AlertCircle className="w-12 h-12 text-destructive mb-3" />
        <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
        <p className="text-sm text-muted-foreground mt-1">You do not have administrative privileges to view this page.</p>
      </div>
    );
  }

  const timeEntries = getSafeArray(entriesData, 'timeEntries', 'data');
  const budgetRequests = getSafeArray(budgetData, 'budgetRequests', 'data');

  const currentDataset = viewMode === 'TIME_ENTRIES' ? timeEntries : budgetRequests;
  const isLoading = viewMode === 'TIME_ENTRIES' ? isLoadingEntries : isLoadingBudgets;

  const filteredData = currentDataset.filter((item: any) => {
    const statusField = viewMode === 'TIME_ENTRIES' ? item.approvalStatus : item.status;
    const currentStatus = statusField || 'PENDING';
    const statusMatches = currentStatus === activeTab;
    
    const userName = `${item.user?.firstName || ''} ${item.user?.lastName || ''}`.toLowerCase();
    const projectName = (item.project?.name || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const searchMatches = userName.includes(query) || projectName.includes(query);
    
    return statusMatches && searchMatches;
  });

  const getInitials = (first: string, last: string) => {
    return `${(first || 'U').charAt(0)}${(last || '').charAt(0)}`.toUpperCase();
  };

  const handleApproveEntry = async (id: string, e?: React.MouseEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    const toastId = toast.loading('Approving entry...');
    try {
      await axiosInstance.patch(`/time-entries/review/${id}`, { approvalStatus: 'APPROVED' });
      toast.success('Time entry approved!', { id: toastId });
      refetchEntries();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve', { id: toastId });
    }
  };

  const handleApproveBudget = async (id: string, e?: React.MouseEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    const toastId = toast.loading('Approving budget request...');
    try {
      await axiosInstance.patch(`/projects/budget-requests/${id}/approve`);
      toast.success('Budget approved!', { id: toastId });
      refetchBudgets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve', { id: toastId });
    }
  };

  const openRejectModal = (entry: any, e?: React.MouseEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    setSelectedEntry(entry);
    setRejectModalOpen(true);
  };

  const handleViewNotes = (url: string, e?: React.MouseEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    if (!url) return;

    if (url.startsWith('data:')) {
      const win = window.open();
      if (win) {
        win.document.write(`
          <html>
            <head>
              <title>Document Preview</title>
              <style>
                body { margin: 0; display: flex; justify-content: center; align-items: center; background: #07111F; height: 100vh; overflow: hidden; }
                img { max-width: 95%; max-height: 95vh; object-fit: contain; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
              </style>
            </head>
            <body><img src="${url}" alt="Preview" /></body>
          </html>
        `);
        win.document.close();
      } else {
        toast.error("Popup blocked! Please allow popups to view documents.");
      }
    } else {
      const filename = url.split('/').pop(); 
      const finalUrl = url.startsWith('http') ? url : `${backendDomain}/api/v1/time-entries/file/${filename}`;
      window.open(finalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const fetchAndZipFile = async (url: string, zip: JSZip, prefixName: string) => {
    if (!url) return 0;
    try {
      if (url.startsWith('data:')) {
        const arr = url.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        const ext = mime.split('/')[1] || 'png';
        zip.file(`${prefixName}.${ext}`, u8arr);
        return 1;
      } else {
        const filename = url.split('/').pop() || '';
        const finalUrl = url.startsWith('http') ? url : `${backendDomain}/api/v1/time-entries/file/${filename}`;
        const response = await fetch(finalUrl);
        if (response.ok) {
            const blob = await response.blob();
            const extMatch = filename.match(/\.([^.]+)$/);
            const ext = extMatch ? extMatch[1] : 'pdf';
            zip.file(`${prefixName}.${ext}`, blob);
            return 1;
        }
      }
    } catch (e) { console.error('Fetch error for', url); }
    return 0;
  };

  const downloadAllAsZip = async (e?: React.MouseEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    const entriesWithDocs = filteredData.filter((e: any) => e.cnrDocumentUrl || e.attendanceDocumentUrl);
    if (entriesWithDocs.length === 0) {
      toast.error(`No documents found in ${activeTab} tab.`);
      return;
    }

    setIsZipping(true);
    const toastId = toast.loading(`Gathering documents from ${entriesWithDocs.length} entries...`);
    
    try {
      const zip = new JSZip();
      let count = 0;

      for (const entry of entriesWithDocs) {
        const userName = `${entry.user?.firstName}_${entry.user?.lastName}`.replace(/\s+/g, '');
        const dateStr = new Date(entry.date).toISOString().split('T')[0];
        const baseName = `${userName}_${dateStr}`;
        
        count += await fetchAndZipFile(entry.cnrDocumentUrl, zip, `${baseName}_CNR`);
        count += await fetchAndZipFile(entry.attendanceDocumentUrl, zip, `${baseName}_Attendance`);
      }

      if (count > 0) {
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `TimeFlow_${activeTab}_All_Docs.zip`);
        toast.success(`Successfully zipped ${count} documents!`, { id: toastId });
      } else {
        toast.error('Failed to retrieve documents. Ensure they exist on server.', { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error('Error generating bulk ZIP', { id: toastId });
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="timeflow-container space-y-6 animate-in fade-in duration-500 py-6">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-success" />
            Manager Approvals
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Review, approve, and manage time logs & budgets submitted by your team.
          </p>
        </div>
        {viewMode === 'TIME_ENTRIES' && (
          <button 
            type="button"
            onClick={downloadAllAsZip}
            disabled={isZipping || filteredData.length === 0}
            className="flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 px-4 py-3 min-h-[44px] rounded-xl transition-all font-semibold disabled:opacity-50 touch-manipulation w-full sm:w-auto"
          >
            {isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
            Download All as ZIP
          </button>
        )}
      </div>

      <div className="flex gap-2 bg-card p-1.5 rounded-xl border border-border w-fit shadow-sm">
        <button
          type="button"
          onClick={() => { setViewMode('TIME_ENTRIES'); setActiveTab('PENDING'); }}
          className={`px-5 py-2 min-h-[44px] rounded-lg text-sm transition-all touch-manipulation cursor-pointer ${
            viewMode === 'TIME_ENTRIES' 
              ? 'bg-accent text-foreground font-bold shadow-sm' 
              : 'text-muted-foreground hover:text-foreground font-semibold'
          }`}
        >
          Time Entries
        </button>
        <button
          type="button"
          onClick={() => { setViewMode('BUDGET_REQUESTS'); setActiveTab('PENDING'); }}
          className={`px-5 py-2 min-h-[44px] rounded-lg text-sm transition-all touch-manipulation cursor-pointer ${
            viewMode === 'BUDGET_REQUESTS' 
              ? 'bg-accent text-foreground font-bold shadow-sm' 
              : 'text-muted-foreground hover:text-foreground font-semibold'
          }`}
        >
          Budget Requests
        </button>
      </div>

      <div className="enterprise-card p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-1 bg-background p-1 rounded-[12px] border border-border w-full sm:w-auto">
          <button type="button" onClick={() => setActiveTab('PENDING')} className={`flex-1 sm:flex-none px-4 py-2 min-h-[44px] rounded-[8px] text-sm font-semibold transition-all touch-manipulation flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'PENDING' ? 'bg-accent text-foreground font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <Clock className="w-4 h-4 pointer-events-none" /> Pending
          </button>
          <button type="button" onClick={() => setActiveTab('APPROVED')} className={`flex-1 sm:flex-none px-4 py-2 min-h-[44px] rounded-[8px] text-sm font-semibold transition-all touch-manipulation flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'APPROVED' ? 'bg-success/20 text-success' : 'text-muted-foreground hover:text-foreground'}`}>
            <CheckCircle className="w-4 h-4 pointer-events-none" /> Approved
          </button>
          <button type="button" onClick={() => setActiveTab('REJECTED')} className={`flex-1 sm:flex-none px-4 py-2 min-h-[44px] rounded-[8px] text-sm font-semibold transition-all touch-manipulation flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'REJECTED' ? 'bg-destructive/20 text-destructive' : 'text-muted-foreground hover:text-foreground'}`}>
            <XCircle className="w-4 h-4 pointer-events-none" /> Rejected
          </button>
        </div>

        <div className="relative w-full sm:max-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input type="text" placeholder="Search team or project..." className="input-field pl-9 h-[44px] bg-background text-foreground border-border" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>

      <div className="enterprise-table-container border border-border/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead className="bg-card border-b border-border text-muted-foreground text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="py-4 pl-6 font-semibold">Date & User</th>
                <th className="py-4 px-4 font-semibold">Project & Task Details</th>
                
                {viewMode === 'TIME_ENTRIES' ? (
                  <>
                    <th className="py-4 px-4 font-semibold text-center">Duration</th>
                    <th className="py-4 px-4 font-semibold">Billing</th>
                  </>
                ) : (
                  <>
                    <th className="py-4 px-4 font-semibold text-center">Req. Hours</th>
                    <th className="py-4 px-4 font-semibold">Reason</th>
                  </>
                )}
                
                <th className="py-4 pr-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="h-40 text-center bg-background">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-xs text-muted-foreground opacity-70">Fetching {viewMode === 'TIME_ENTRIES' ? 'time entries' : 'budget requests'}...</p>
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((item: any) => (
                  <tr key={item.id} className="enterprise-table-row bg-background hover:bg-accent/50 transition-colors group">
                    <td className="py-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold border bg-accent text-info border-primary/30 shrink-0">
                          {getInitials(item.user?.firstName, item.user?.lastName)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{item.user?.firstName} {item.user?.lastName}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {new Date(item.date || item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 max-w-[250px]">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-primary opacity-70 pointer-events-none" />
                          {item.project?.name || 'Unknown Project'}
                        </span>
                        
                        {item.task?.name ? (
                          <span className="text-[11px] text-primary/90 bg-primary/10 border border-primary/20 w-fit px-1.5 py-0.5 rounded font-medium">
                            Task: {item.task.name}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">General Task</span>
                        )}
                        
                        {viewMode === 'TIME_ENTRIES' && item.description && (
                          <span className="text-xs text-muted-foreground mt-0.5 truncate max-w-full">
                            {item.description}
                          </span>
                        )}

                        {viewMode === 'TIME_ENTRIES' && (item.cnrDocumentUrl || item.attendanceDocumentUrl) && (
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {item.cnrDocumentUrl && (
                              <button 
                                type="button"
                                onClick={(e) => handleViewNotes(item.cnrDocumentUrl, e)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary hover:text-white px-2 py-1 rounded border border-primary/20 transition-all cursor-pointer z-10"
                                title="View Clinical Note"
                              >
                                <FileText className="w-3 h-3 pointer-events-none" /> CNR Doc
                              </button>
                            )}
                            {item.attendanceDocumentUrl && (
                              <button 
                                type="button"
                                onClick={(e) => handleViewNotes(item.attendanceDocumentUrl, e)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-50 hover:text-white px-2 py-1 rounded border border-emerald-500/20 transition-all cursor-pointer z-10"
                                title="View Attendance Record"
                              >
                                <FileText className="w-3 h-3 pointer-events-none" /> Attendance
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {viewMode === 'TIME_ENTRIES' ? (
                      <>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex px-2.5 py-1 rounded-md bg-card border border-border text-sm font-bold text-foreground shadow-inner">
                            {Number(item.duration).toFixed(2)}h
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {item.isBillable ? (
                            <div className="flex flex-col">
                              <span className="badge-base badge-paid w-fit mb-1">Billable</span>
                              <span className="text-xs font-medium text-emerald-400">${Number(item.billableAmount || 0).toFixed(2)}</span>
                            </div>
                          ) : (
                            <span className="badge-base badge-cancelled">Non-Billable</span>
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex px-2.5 py-1 rounded-md bg-warning/10 border border-warning/30 text-sm font-bold text-warning shadow-inner">
                            +{Number(item.requestedHours).toFixed(2)}h
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-xs text-muted-foreground max-w-[200px] truncate" title={item.reason}>
                            {item.reason || 'No reason provided'}
                          </p>
                        </td>
                      </>
                    )}

                    <td className="py-4 pr-6 text-right">
                      {activeTab === 'PENDING' && (
                        <div className="flex items-center justify-end gap-3 md:gap-2">
                          <button 
                            type="button"
                            onClick={(e) => viewMode === 'TIME_ENTRIES' ? handleApproveEntry(item.id, e) : handleApproveBudget(item.id, e)} 
                            className="p-3 md:p-2 flex items-center justify-center min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 rounded-xl md:rounded-lg bg-success/10 text-success hover:bg-success hover:text-white border border-success/20 transition-all touch-manipulation active:scale-95 cursor-pointer" 
                            title="Approve"
                          >
                            <CheckCircle className="w-6 h-6 md:w-5 md:h-5 pointer-events-none" />
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => openRejectModal(item, e)} 
                            className="p-3 md:p-2 flex items-center justify-center min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 rounded-xl md:rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border border-destructive/20 transition-all touch-manipulation active:scale-95 cursor-pointer" 
                            title="Reject"
                          >
                            <XCircle className="w-6 h-6 md:w-5 md:h-5 pointer-events-none" />
                          </button>
                        </div>
                      )}
                      {activeTab === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-success bg-success/10 px-2 py-1 rounded-md">
                          <CheckCircle className="w-3.5 h-3.5 pointer-events-none" /> Approved
                        </span>
                      )}
                      {activeTab === 'REJECTED' && (
                        <div className="flex flex-col items-end text-xs max-w-[200px] ml-auto">
                          <span className="inline-flex items-center gap-1 font-bold text-destructive mb-1">
                            <AlertCircle className="w-3.5 h-3.5 pointer-events-none" /> Rejected
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate w-full text-right" title={item.rejectionReason || item.reason}>
                            "{item.rejectionReason || item.reason}"
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="h-40 text-center text-muted-foreground bg-background">
                    <CheckCircle className="w-8 h-8 mb-3 opacity-20 mx-auto text-primary pointer-events-none" />
                    <p className="font-medium text-foreground">All caught up!</p>
                    <p className="text-xs mt-1">No {activeTab.toLowerCase()} {viewMode === 'TIME_ENTRIES' ? 'entries' : 'requests'} found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RejectModal 
        isOpen={rejectModalOpen} 
        onClose={() => setRejectModalOpen(false)} 
        onSuccess={() => viewMode === 'TIME_ENTRIES' ? refetchEntries() : refetchBudgets()} 
        entry={selectedEntry} 
        apiEndpoint={viewMode === 'TIME_ENTRIES' ? `/time-entries/review/${selectedEntry?.id}` : `/projects/budget-requests/${selectedEntry?.id}/reject`}
      />
    </div>
  );
}
