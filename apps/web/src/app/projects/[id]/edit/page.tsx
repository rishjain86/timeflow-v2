'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Briefcase, Calendar, DollarSign, Save } from 'lucide-react';
import { useTheme } from 'next-themes';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { useProject } from '@/features/projects/api/get-project';
import { useUpdateProject } from '@/features/projects/api/update-project';
import { useOrganization } from '@/features/organizations/api/get-organization';

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  
  const { data: project, isLoading: isFetching } = useProject(id);
  const { mutate: updateProject, isPending: isUpdating } = useUpdateProject();
  const { data: currentOrganization } = useOrganization();
  
  const isHealthcare = currentOrganization?.industryType === 'HEALTHCARE';

  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const [formData, setFormData] = useState({
    name: '',
    client: 'Unknown', 
    budget: '',
    deadline: '',
    status: 'ACTIVE',
    description: '',
  });

  useEffect(() => {
    if (project) {
      const dateVal = project.deadline || project.endDate;
      
      let displayClientName = 'Unknown';
      
      // Step 1: Check actual DB relations first
      if (project.assignedTo?.firstName) {
        displayClientName = `${project.assignedTo.firstName} ${project.assignedTo.lastName || ''}`.trim();
      } else if (project.client?.name) {
        displayClientName = project.client.name;
      }
      
      // Step 2: ULTIMATE FALLBACK - Extract from the stitched string if relation is missing
      if (displayClientName === 'Unknown' || !displayClientName) {
        if (project.name && project.name.includes('- Assigned ')) {
          const match = project.name.match(/- Assigned ([^-]+)/);
          if (match && match[1]) {
            displayClientName = match[1].trim();
          }
        } else if (project.name && project.name.includes(' - ')) {
          displayClientName = project.name.split(' - ')[0].trim();
        }
      }
      
      setFormData({
        name: project.name || '',
        client: displayClientName,
        budget: project.budget?.toString() || '',
        deadline: dateVal ? new Date(dateVal).toISOString().split('T')[0] : '',
        status: project.status || 'ACTIVE',
        description: project.description || '',
      });
    }
  }, [project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateProject(
      { 
        id: id,
        name: formData.name,
        description: formData.description,
        status: formData.status,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Project updated successfully!');
          router.push(`/projects/${id}`);
        },
        onError: (error: any) => {
          toast.error(error?.response?.data?.message || 'Failed to update project');
        }
      }
    );
  };

  if (isFetching) {
    return <div className="text-center py-20 text-muted-foreground">Loading project data...</div>;
  }

  return (
    <div className="timeflow-container py-8 max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      <div className="flex items-center justify-between">
        <Link 
          href={`/projects/${id}`} 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Project Details</span>
        </Link>
      </div>

      <div className="bg-card border border-border rounded-[16px] p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <div className="h-10 w-10 bg-primary/20 text-info rounded-[10px] flex items-center justify-center border border-primary/30">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Edit Project</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Modify project details, update budget, or change status.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">{isHealthcare ? 'Case Name' : 'Project Name'}</label>
            <Input 
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-background border-border text-foreground h-[44px] rounded-[10px] focus-visible:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{isHealthcare ? 'Assigned Therapist / Payor' : 'Client Name'}</label>
              <Input 
                disabled
                value={formData.client}
                className="bg-background/50 border-border text-muted-foreground h-[44px] rounded-[10px] cursor-not-allowed font-medium"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full h-[44px] rounded-[10px] bg-background px-3 text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm cursor-pointer"
              >
                <option value="ACTIVE" className="bg-card">Active</option>
                <option value="ON_HOLD" className="bg-card">On Hold</option>
                <option value="PLANNING" className="bg-card">Planning</option>
                <option value="COMPLETED" className="bg-card">Completed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Budget ($)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="bg-background border-border text-foreground pl-9 h-[44px] rounded-[10px] focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Target Deadline</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="bg-background border-border text-foreground pl-9 h-[44px] rounded-[10px] focus-visible:ring-primary"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Description & Notes</label>
            <Textarea 
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-background border-border text-foreground min-h-[120px] rounded-[10px] focus-visible:ring-primary resize-none p-3"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => router.push(`/projects/${id}`)}
              className="text-muted-foreground hover:text-foreground h-[44px] px-5 rounded-[10px]"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isUpdating}
              className={`bg-primary hover:bg-primary/95 font-semibold h-[44px] px-6 rounded-[10px] shadow-md transition-all flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900 font-bold'}`}
            >
              <Save className="h-4 w-4" />
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
