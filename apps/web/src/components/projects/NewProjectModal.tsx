'use client';

import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Loader2, Plus } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';
import toast from 'react-hot-toast';

import { useOrganization } from '@/features/organizations/api/get-organization';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewProjectModal({ isOpen, onClose }: NewProjectModalProps) {
  const queryClient = useQueryClient();
  const { data: currentOrganization } = useOrganization();
  const isHealthcare = currentOrganization?.industryType === 'HEALTHCARE';

  const [isPending, setIsPending] = useState(false);
  
  // Base State
  const [projectName, setProjectName] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [status, setStatus] = useState('active');

  // HEALTHCARE STATE
  const [hcaiNumber, setHcaiNumber] = useState('');
  const [modality, setModality] = useState('OT TX');
  const [approvalStatus, setApprovalStatus] = useState('PARTIALLY APPROVED');
  const [rateType, setRateType] = useState('99.75');
  const [customRate, setCustomRate] = useState('');
  const [notes, setNotes] = useState('');

  // Tags State for Approved/Not Approved Services
  const [notApprovedList, setNotApprovedList] = useState<string[]>([]);
  const [notApprovedInput, setNotApprovedInput] = useState('');
  const [approvedList, setApprovedList] = useState<string[]>([]);
  const [approvedInput, setApprovedInput] = useState('');

  // Fetch Users (Therapists)
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['organization-users'],
    queryFn: async () => {
      const response = await axiosInstance.get('/users');
      return response.data?.data?.users || response.data?.data || response.data || [];
    },
    enabled: isOpen,
  });

  // Fetch Existing Clients/Patients for Dropdown
  const { data: clients = [], isLoading: isLoadingClients } = useQuery({
    queryKey: ['organization-clients'],
    queryFn: async () => {
      const response = await axiosInstance.get('/clients');
      return response.data?.data?.clients || response.data?.data || response.data || [];
    },
    enabled: isOpen,
  });

  // Strict theme logic
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  
  const solidBg = isDark ? '#1E293B' : '#ffffff';
  const solidText = isDark ? '#ffffff' : '#0F172A';

  if (!isOpen) return null;

  // Tag Handlers
  const handleAddTagBtn = (type: 'approved' | 'notApproved') => {
    if (type === 'notApproved' && notApprovedInput.trim()) {
      setNotApprovedList([...notApprovedList, notApprovedInput.trim().toUpperCase()]);
      setNotApprovedInput('');
    } else if (type === 'approved' && approvedInput.trim()) {
      setApprovedList([...approvedList, approvedInput.trim().toUpperCase()]);
      setApprovedInput('');
    }
  };

  const handleAddTagKey = (type: 'approved' | 'notApproved', e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTagBtn(type);
    }
  };

  const removeTag = (type: 'approved' | 'notApproved', index: number) => {
    if (type === 'notApproved') {
      setNotApprovedList(notApprovedList.filter((_, i) => i !== index));
    } else {
      setApprovedList(approvedList.filter((_, i) => i !== index));
    }
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast.error(`${isHealthcare ? 'Patient Name' : 'Project Name'} is required!`);
      return;
    }
    if (!assignedUserId) {
      toast.error(`Please select a ${isHealthcare ? 'Therapist / Case Owner' : 'Team Member / Owner'}!`);
      return;
    }

    const finalRate = rateType === 'CUSTOM' ? customRate : rateType;

    // STITCHING NAME ON FRONTEND
    let finalStitchedName = projectName.trim();

    if (isHealthcare) {
      let generatedName = `${projectName.trim()}`;
      if (hcaiNumber) generatedName += ` - HCAI ${hcaiNumber}`;
      if (modality) generatedName += ` - ${modality}`;
      if (approvalStatus) generatedName += ` - ${approvalStatus}`;
      if (finalRate) generatedName += ` @ ${finalRate}/hour`;
      
      const selectedUser = users.find((u: any) => u.id === assignedUserId);
      if (selectedUser) generatedName += ` - Assigned ${selectedUser.firstName}`;

      const noServicesStr = notApprovedList.length > 0 
        ? notApprovedList.map(s => `(NO ${s})`).join(' ') 
        : '';
      if (noServicesStr) generatedName += ` - ${noServicesStr}`;

      const approvedServicesStr = approvedList.length > 0 
        ? approvedList.join(' OR ') 
        : '';
      if (approvedServicesStr) generatedName += ` - ${approvedServicesStr}`;

      if (notes) generatedName += ` - (${notes})`;
      
      // Append a unique 4-digit code to prevent identical name database errors
      generatedName += ` - #${Math.floor(1000 + Math.random() * 9000)}`;
      
      finalStitchedName = generatedName.trim();
    }

    const payload: any = {
      name: finalStitchedName, // 🟢 STITCHED NAME for Project/Case
      patientName: projectName.trim(), // 🟢 CLEAN NAME for Client/Payor Creation
      assignedToId: assignedUserId, 
      assignedUserId: assignedUserId, 
      status: status.toUpperCase(), 
      description: notes
    };

    if (isHealthcare) {
      payload.hcaiNumber = hcaiNumber;
      payload.modality = modality;
      payload.approvalStatus = approvalStatus;
      payload.ratePerHour = finalRate;
      payload.hourlyRate = finalRate; 
      payload.approvedServices = approvedList;
      payload.notApprovedServices = notApprovedList;
    }

    setIsPending(true);
    try {
      await axiosInstance.post('/projects', payload);
      
      // Reset state on success
      setProjectName(''); setAssignedUserId(''); setStatus('active');
      setHcaiNumber(''); setModality('OT TX'); setApprovalStatus('PARTIALLY APPROVED');
      setRateType('99.75'); setCustomRate(''); setNotes('');
      setNotApprovedList([]); setApprovedList([]);
      
      toast.success(`${isHealthcare ? 'Case' : 'Project'} created successfully!`);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onClose();
    } catch (error: any) {
      console.error("Failed to create project", error);
      toast.error(error?.response?.data?.message || `Failed to create ${isHealthcare ? 'case' : 'project'}.`);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-250 p-4">
      <div className={`w-full ${isHealthcare ? 'max-w-2xl' : 'max-w-md'} border border-border shadow-2xl rounded-[20px] flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-250 ${isDark ? 'bg-[#0F172A]' : 'bg-white'}`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b border-border rounded-t-[20px] ${isDark ? 'bg-[#0F172A]' : 'bg-white'}`}>
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-info" />
            <h2 className="text-lg font-bold text-foreground">Create New {isHealthcare ? 'Case' : 'Project'}</h2>
          </div>
          <button onClick={onClose} disabled={isPending} className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className={`p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5 ${isDark ? 'bg-[#0F172A]' : 'bg-white'}`}>
          
          <div className={`grid grid-cols-1 ${isHealthcare ? 'md:grid-cols-2' : ''} gap-5`}>
            
            {/* Project / Patient Name with Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">
                {isHealthcare ? 'Patient Name' : 'Project Name'} <span className="text-destructive">*</span>
              </label>
              <input 
                type="text" 
                list="patients-list"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder={isHealthcare ? "Type or select existing patient..." : "e.g. Website Redesign"} 
                disabled={isPending || isLoadingClients}
                style={{ backgroundColor: solidBg, color: solidText }}
                className="w-full h-10 px-3 rounded-[12px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
              <datalist id="patients-list">
                {clients.map((c: any) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>

            {/* Assigned User */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">
                {isHealthcare ? 'Therapist / Case Owner' : 'Team Member / Owner'} <span className="text-destructive">*</span>
              </label>
              <select 
                value={assignedUserId}
                onChange={(e) => setAssignedUserId(e.target.value)}
                disabled={isPending || isLoadingUsers}
                style={{ backgroundColor: solidBg, color: solidText }}
                className="w-full h-10 px-3 rounded-[12px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              >
                <option value="" disabled hidden>{isLoadingUsers ? 'Loading...' : 'Select assigned person...'}</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName || ''} ({u.role})</option>
                ))}
              </select>
            </div>

            {/* 🟢 HEALTHCARE ONLY FIELDS */}
            {isHealthcare && (
              <>
                {/* HCAI Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">HCAI Number</label>
                  <input
                    type="text"
                    placeholder="Enter HCAI Number"
                    value={hcaiNumber}
                    onChange={(e) => setHcaiNumber(e.target.value)}
                    style={{ backgroundColor: solidBg, color: solidText }}
                    className="w-full h-10 px-3 rounded-[12px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Modality */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Modality</label>
                  <select
                    value={modality}
                    onChange={(e) => setModality(e.target.value)}
                    style={{ backgroundColor: solidBg, color: solidText }}
                    className="w-full h-10 px-3 rounded-[12px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="OT TX">OT TX</option>
                    <option value="OT AX">OT AX</option>
                    <option value="WSA AX">WSA AX</option>
                    <option value="FCA AX">FCA AX</option>
                    <option value="OT Re-Ax">OT Re-Ax</option>
                    <option value="Devices">Devices</option>
                    <option value="OT TX + Devices">OT TX + Devices</option>
                    <option value="OT TX + Hosp. Discharge">OT TX + Hosp. Discharge</option>
                    <option value="OT Cognifit TX / Cognifit TX">OT Cognifit TX / Cognifit TX</option>
                    <option value="OCF 3">OCF 3</option>
                    <option value="WSIB">WSIB</option>
                  </select>
                </div>

                {/* Approval Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Approval Status</label>
                  <select
                    value={approvalStatus}
                    onChange={(e) => setApprovalStatus(e.target.value)}
                    style={{ backgroundColor: solidBg, color: solidText }}
                    className="w-full h-10 px-3 rounded-[12px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="APPROVED">APPROVED</option>
                    <option value="PARTIALLY APPROVED">PARTIALLY APPROVED</option>
                    <option value="DENIED">DENIED</option>
                    <option value="PROTECTED">PROTECTED</option>
                  </select>
                </div>

                {/* Rates */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Rate Per Hour</label>
                  <div className="flex items-center gap-4 mt-1">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" checked={rateType === '99.75'} onChange={() => setRateType('99.75')} /> $99.75
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" checked={rateType === '119.92'} onChange={() => setRateType('119.92')} /> $119.92
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" checked={rateType === 'CUSTOM'} onChange={() => setRateType('CUSTOM')} /> Custom
                    </label>
                  </div>
                  {rateType === 'CUSTOM' && (
                    <input
                      type="number"
                      placeholder="Enter custom rate..."
                      value={customRate}
                      onChange={(e) => setCustomRate(e.target.value)}
                      style={{ backgroundColor: solidBg, color: solidText }}
                      className="w-full sm:w-1/2 h-10 px-3 rounded-[12px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary mt-2"
                    />
                  )}
                </div>

                {/* Not Approved Services Tags */}
                <div className="space-y-1.5 md:col-span-2 border-t border-border pt-4">
                  <label className="text-xs font-bold text-rose-500 uppercase">Not Approved Services</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {notApprovedList.map((tag, i) => (
                      <span key={i} className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                        NO {tag} <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag('notApproved', i)} />
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type service (e.g. AXXKM)"
                      value={notApprovedInput}
                      onChange={(e) => setNotApprovedInput(e.target.value)}
                      onKeyDown={(e) => handleAddTagKey('notApproved', e)}
                      style={{ backgroundColor: solidBg, color: solidText }}
                      className="flex-1 h-10 px-3 rounded-[12px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button 
                      type="button" 
                      onClick={() => handleAddTagBtn('notApproved')}
                      className="h-10 w-10 flex items-center justify-center bg-primary text-white rounded-[12px] hover:bg-primary/90"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Approved Services Tags */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-emerald-500 uppercase">Approved Services</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {approvedList.map((tag, i) => (
                      <span key={i} className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1">
                        {tag} <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag('approved', i)} />
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type service (e.g. TRAVEL)"
                      value={approvedInput}
                      onChange={(e) => setApprovedInput(e.target.value)}
                      onKeyDown={(e) => handleAddTagKey('approved', e)}
                      style={{ backgroundColor: solidBg, color: solidText }}
                      className="flex-1 h-10 px-3 rounded-[12px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button 
                      type="button" 
                      onClick={() => handleAddTagBtn('approved')}
                      className="h-10 w-10 flex items-center justify-center bg-primary text-white rounded-[12px] hover:bg-primary/90"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* General Fields for both */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase">Status</label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isPending}
                style={{ backgroundColor: solidBg, color: solidText }}
                className="w-full h-10 px-3 rounded-[12px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              >
                <option value="active">Active</option>
                <option value="planning">Planning</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>

            <div className={`space-y-1.5 ${isHealthcare ? 'md:col-span-2' : ''}`}>
              <label className="text-xs font-bold text-muted-foreground uppercase">Notes / Description</label>
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes here..."
                disabled={isPending}
                style={{ backgroundColor: solidBg, color: solidText }}
                className="w-full min-h-[80px] p-3 rounded-[12px] border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
              />
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className={`px-6 py-4 border-t border-border flex justify-end gap-3 rounded-b-[20px] ${isDark ? 'bg-[#0B1120]' : 'bg-slate-50'}`}>
          <button 
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 h-10 rounded-[12px] text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={handleCreateProject}
            disabled={isPending}
            className={`flex items-center gap-2 px-5 py-2 h-10 rounded-[12px] bg-primary hover:bg-primary/90 text-sm font-semibold transition-all shadow-md disabled:opacity-70 ${isDark ? 'text-white' : 'text-slate-900 font-bold'}`}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isHealthcare ? 'Create Case' : 'Create Project'}
          </button>
        </div>

      </div>
    </div>
  );
}
