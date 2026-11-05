'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Building2,
  Trash2,
  Edit2,
  Eye,
  Archive, 
  RefreshCcw,
  Copy 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTheme } from 'next-themes';

import { useProjects } from '@/features/projects/api/get-projects';
import { useDeleteProject } from '@/features/projects/api/delete-project';
import { useUpdateProjectStatus } from '@/features/projects/api/update-project-status';
import { useDuplicateProject } from '@/features/projects/api/duplicate-project';
import { NewProjectModal } from '@/components/projects/NewProjectModal';
import { axiosInstance } from '@/lib/axios'; 
import { useOrganization } from '@/features/organizations/api/get-organization'; // 🟢 NEW: Fetched for feature toggling

const getStatusBadge = (status: string) => {
  const normalizedStatus = status?.toLowerCase() || '';
  if (normalizedStatus.includes('active')) return <span className="badge-base badge-paid">Active</span>;
  if (normalizedStatus.includes('risk') || normalizedStatus.includes('hold')) return <span className="badge-base badge-overdue">{status}</span>;
  if (normalizedStatus.includes('pause') || normalizedStatus.includes('plan')) return <span className="badge-base badge-pending">{status}</span>;
  if (normalizedStatus.includes('complete')) return <span className="badge-base badge-completed">Completed</span>;
  return <span className="badge-base">{status || 'Unknown'}</span>;
};

export default function ProjectsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: currentOrganization } = useOrganization(); // 🟢 NEW: Get current org context

  // 🟢 FIX: For solid background native select dropdown options (Same as Dashboard)
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const solidMenuBg = isDark ? '#1E293B' : '#ffffff'; 
  const solidText = isDark ? '#ffffff' : '#0F172A';

  const isHealthcare = currentOrganization?.industryType === 'HEALTHCARE'; // 🟢 NEW: Feature Toggle Flag

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const { data: rawData, isLoading, refetch } = useProjects({ 
    search: searchQuery, 
    status: statusFilter, 
    page: currentPage, 
    limit: 20 
  });
  
  const { mutate: deleteProject } = useDeleteProject();
  const { mutate: updateStatus } = useUpdateProjectStatus();
  const { mutate: duplicateProject } = useDuplicateProject();

  const projectsList = Array.isArray(rawData) ? rawData : [];
  const meta = (rawData as any)?.meta || { total: projectsList.length, page: 1, totalPages: 1 };

  const handleDelete = (id: string, name: string) => {
    setTimeout(() => {
      if (window.confirm(`Are you sure you want to delete the ${isHealthcare ? 'case' : 'project'} "${name}"?`)) {
        deleteProject(id);
      }
    }, 100);
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    updateStatus(
      { id, status: newStatus },
      {
        onSuccess: () => toast.success('Status updated successfully!'),
        onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to update status')
      }
    );
  };

  const handleToggleArchive = (projectId: string, currentArchiveStatus: boolean) => {
    setTimeout(async () => {
      const actionText = currentArchiveStatus ? 'restore' : 'archive';
      const entityName = isHealthcare ? 'case' : 'project';
      if (!window.confirm(`Are you sure you want to ${actionText} this ${entityName}?`)) return;

      const toastId = toast.loading('Processing request...');
      try {
        await axiosInstance.patch(`/projects/${projectId}/archive`, {
          isArchived: !currentArchiveStatus 
        });
        toast.success(`${entityName.charAt(0).toUpperCase() + entityName.slice(1)} ${currentArchiveStatus ? 'restored' : 'archived'} successfully`, { id: toastId });
        if (refetch) refetch(); 
      } catch (error: any) {
        toast.error(error?.response?.data?.message || `Failed to ${actionText} ${entityName}`, { id: toastId });
      }
    }, 100);
  };

  const handleDuplicate = (projectId: string) => {
    const entityName = isHealthcare ? 'Case' : 'Project';
    const toastId = toast.loading(`Duplicating ${entityName.toLowerCase()}...`);
    duplicateProject(projectId, {
      onSuccess: () => {
        toast.success(`${entityName} duplicated successfully!`, { id: toastId });
        if (refetch) refetch();
      },
      onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to duplicate', { id: toastId })
    });
  };

  return (
    <div className="timeflow-container space-y-6 animate-in fade-in duration-500 py-6">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-20 relative">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {isHealthcare ? 'Cases / Patients' : 'Projects'}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage your client {isHealthcare ? 'cases' : 'projects'}, budgets, and team assignments.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary shrink-0 w-full sm:w-auto flex items-center justify-center"
        >
          <Plus className="w-4 h-4 mr-2" /> Create {isHealthcare ? 'Case' : 'Project'}
        </button>
      </div>

      <div className="enterprise-card p-4 flex flex-col sm:flex-row justify-between items-center gap-4 z-10 relative">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${isHealthcare ? 'cases or patients' : 'projects or clients'}...`}
            className="input-field pl-9 bg-background text-foreground border-border"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="btn-secondary w-full sm:w-auto appearance-none cursor-pointer bg-card text-foreground"
          >
            <option value="" style={{ backgroundColor: solidMenuBg, color: solidText }}>All Statuses</option>
            <option value="ACTIVE" style={{ backgroundColor: solidMenuBg, color: solidText }}>Active</option>
            <option value="ON_HOLD" style={{ backgroundColor: solidMenuBg, color: solidText }}>On Hold</option>
            <option value="COMPLETED" style={{ backgroundColor: solidMenuBg, color: solidText }}>Completed</option>
          </select>
        </div>
      </div>

      <div className="enterprise-table-container">
        <div className="overflow-x-auto relative min-h-[300px]">
          <table className="w-full text-left border-collapse min-w-[900px] z-10 relative">
            <thead className="enterprise-table-header">
              <tr>
                <th className="enterprise-table-head w-[30%] pl-6">{isHealthcare ? 'Patient Name & Client' : 'Project Name & Client'}</th>
                <th className="enterprise-table-head">Status</th>
                <th className="enterprise-table-head w-[25%]">Hours Tracked / Allocated</th>
                <th className="enterprise-table-head">Team</th>
                <th className="enterprise-table-head">Due Date</th>
                <th className="enterprise-table-head text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-muted-foreground bg-background">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                      Loading records...
                    </div>
                  </td>
                </tr>
              ) : projectsList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-muted-foreground bg-background">
                    No records found matching your criteria.
                  </td>
                </tr>
              ) : (
                projectsList.map((project: any) => {
                  const projectId = project.id || project._id; 
                  const linkId = projectId; 

                  const consumed = Number(project.projectBudget?.consumedHours || 0);
                  const allocated = Number(project.projectBudget?.totalAllocatedHours || 0);
                  let progress = 0;

                  if (project.projectBudget?.progressPercentage) {
                      progress = Number(project.projectBudget.progressPercentage);
                  } else if (allocated > 0) {
                      progress = (consumed / allocated) * 100;
                  }
                  const displayProgress = Math.min(100, Math.max(0, progress));

                  const clientName = typeof project.client === 'object' ? project.client?.name : (project.client || 'Unknown Client');

                  return (
                    <tr key={projectId} className={`enterprise-table-row group hover:bg-accent/50 transition-colors ${project.isArchived ? 'opacity-60' : ''}`}>
                      <td className="enterprise-table-cell pl-6">
                        <div className="flex flex-col items-start gap-1 relative z-20">
                          <div className="flex items-start gap-2 flex-wrap">
                            <Link href={`/projects/${linkId}`} className="font-semibold text-foreground text-base group-hover:text-info transition-colors block line-clamp-2 whitespace-normal break-words max-w-[200px] sm:max-w-[300px]">
                              {project.name}
                            </Link>
                            {project.isArchived && (
                              <span className="bg-accent text-muted-foreground border border-border px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 mt-0.5">
                                Archived
                              </span>
                            )}
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground mt-1 gap-1.5 font-medium pointer-events-none w-full">
                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{clientName}</span>
                          </div>
                        </div>
                      </td>

                      <td className="enterprise-table-cell align-middle">
                        {project.isArchived ? (
                          <div className="opacity-50 cursor-not-allowed inline-block">
                            {getStatusBadge(project.status)}
                          </div>
                        ) : (
                          <div className="relative inline-block w-fit">
                            <div className="hover:opacity-80 transition-opacity pointer-events-none">
                              {getStatusBadge(project.status)}
                            </div>
                            <select
                              title="Change Status"
                              className="absolute inset-0 w-full h-full cursor-pointer bg-transparent text-transparent"
                              style={{ opacity: 0, zIndex: 10, appearance: 'none', WebkitAppearance: 'none' }}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  handleStatusChange(projectId, val);
                                  e.target.value = '';
                                }
                              }}
                              value=""
                            >
                              <option value="" disabled hidden style={{ backgroundColor: solidMenuBg, color: solidText }}>Change Status</option>
                              <option value="ACTIVE" style={{ backgroundColor: solidMenuBg, color: solidText }}>🟢 Active</option>
                              <option value="ON_HOLD" style={{ backgroundColor: solidMenuBg, color: solidText }}>🟠 On Hold</option>
                              <option value="COMPLETED" style={{ backgroundColor: solidMenuBg, color: solidText }}>🔵 Completed</option>
                            </select>
                          </div>
                        )}
                      </td>

                      <td className="enterprise-table-cell pointer-events-none">
                        <div className="flex justify-between text-xs font-medium mb-2">
                          <span className="text-muted-foreground font-semibold">Tracked</span>
                          <span className="text-foreground font-bold text-[11px]">
                            {allocated > 0 
                              ? `${consumed.toFixed(1)}h / ${allocated.toFixed(1)}h` 
                              : 'No hours allocated'}
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-background border border-border rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              displayProgress >= 90 ? 'bg-rose-500 shadow-[0_0_10px_rgba(225,29,72,0.8)]' : 
                              displayProgress >= 75 ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]' : 
                              'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]'
                            }`}
                            style={{ width: `${displayProgress}%` }}
                          ></div>
                        </div>
                      </td>

                      <td className="enterprise-table-cell pointer-events-none">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <div className="flex -space-x-2">
                            <div className="h-7 w-7 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center text-[10px] font-bold text-info">JD</div>
                            <div className="h-7 w-7 rounded-full bg-success/20 border-2 border-card flex items-center justify-center text-[10px] font-bold text-success">AS</div>
                          </div>
                        </div>
                      </td>

                      <td className="enterprise-table-cell text-sm text-muted-foreground font-medium pointer-events-none">
                        {project.deadline || project.endDate ? new Date(project.deadline || project.endDate).toLocaleDateString() : 'TBD'}
                      </td>

                      <td className="enterprise-table-cell text-right pr-6">
                        <div className="relative flex items-center justify-center w-8 h-8 rounded-md bg-accent/50 hover:bg-accent border border-border/50 shadow-sm transition-colors float-right">
                          <MoreVertical className="absolute w-5 h-5 text-foreground pointer-events-none" style={{ zIndex: 1 }} />
                          <select
                            title="Actions"
                            className="absolute inset-0 w-full h-full cursor-pointer bg-transparent text-transparent"
                            style={{ opacity: 0, zIndex: 10, appearance: 'none', WebkitAppearance: 'none' }}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'view') router.push(`/projects/${linkId}`);
                              if (val === 'edit') router.push(`/projects/${linkId}/edit`);
                              if (val === 'duplicate') handleDuplicate(projectId);
                              if (val === 'archive') handleToggleArchive(projectId, Boolean(project.isArchived));
                              if (val === 'delete') handleDelete(projectId, project.name);
                              e.target.value = '';
                            }}
                            value=""
                          >
                            <option value="" disabled hidden style={{ backgroundColor: solidMenuBg, color: solidText }}></option>
                            <option value="view" style={{ backgroundColor: solidMenuBg, color: solidText }}>👁️ View Details</option>
                            {!project.isArchived && <option value="edit" style={{ backgroundColor: solidMenuBg, color: solidText }}>✏️ Edit {isHealthcare ? 'Case' : 'Project'}</option>}
                            <option value="duplicate" style={{ backgroundColor: solidMenuBg, color: solidText }}>📋 Duplicate</option>
                            <option value="archive" style={{ backgroundColor: solidMenuBg, color: solidText }}>{project.isArchived ? `🔄 Restore ${isHealthcare ? 'Case' : 'Project'}` : `📦 Archive ${isHealthcare ? 'Case' : 'Project'}`}</option>
                            <option value="delete" style={{ backgroundColor: solidMenuBg, color: solidText }}>🗑️ Delete</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 🟢 FULLY FUNCTIONAL PAGINATION CONTROLS */}
        {!isLoading && meta.total > 0 && (
          <div className="p-4 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <span className="font-medium">
              Showing {(meta.page - 1) * meta.limit + 1} - {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} records
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={meta.page <= 1}
                className={`btn-secondary h-8 px-4 text-xs font-medium transition-all ${meta.page <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent hover:text-foreground'}`}
              >
                Previous
              </button>
              <span className="flex items-center px-2 text-xs font-semibold">Page {meta.page} of {meta.totalPages}</span>
              <button 
                onClick={() => setCurrentPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={meta.page >= meta.totalPages}
                className={`btn-secondary h-8 px-4 text-xs font-medium transition-all ${meta.page >= meta.totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent hover:text-foreground'}`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <NewProjectModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

    </div>
  );
}
