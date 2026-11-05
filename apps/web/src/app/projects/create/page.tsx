'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Calendar as CalendarIcon, 
  Briefcase, 
  DollarSign, 
  Users,
  Settings2,
  CheckCircle2
} from 'lucide-react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Import our create hook
import { useCreateProject } from '@/features/projects/api/create-project';

export default function CreateProjectPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("general");

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  // API Hook
  const { mutate: createProject, isPending } = useCreateProject();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createProject(
      { name, description, status: 'ACTIVE' },
      {
        onSuccess: () => {
          router.push('/projects');
        }
      }
    );
  };

  return (
    <div className="timeflow-container py-6 flex flex-col items-center animate-in fade-in duration-500 min-h-[calc(100vh-4rem)]">
      
      {/* Centered Container for Form */}
      <div className="w-full max-w-3xl space-y-8 mt-4">
        
        {/* Header */}
        <div className="flex flex-col items-start gap-2 border-b border-border pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Create New Project
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Set up a new client project, configure billing, and assign team members.
          </p>
        </div>

        {/* Tabbed Interface */}
        <form onSubmit={handleSubmit} className="w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col">
            
            {/* Tabs List */}
            <TabsList className="grid w-full grid-cols-3 mb-8 bg-[#0F172A] border border-border h-[48px] p-1 rounded-[12px]">
              <TabsTrigger value="general" className="rounded-[8px] data-[state=active]:bg-[#172554] data-[state=active]:text-white text-muted-foreground transition-all font-semibold text-xs sm:text-sm">
                1. General Info
              </TabsTrigger>
              <TabsTrigger value="billing" className="rounded-[8px] data-[state=active]:bg-[#172554] data-[state=active]:text-white text-muted-foreground transition-all font-semibold text-xs sm:text-sm">
                2. Billing & Budget
              </TabsTrigger>
              <TabsTrigger value="team" className="rounded-[8px] data-[state=active]:bg-[#172554] data-[state=active]:text-white text-muted-foreground transition-all font-semibold text-xs sm:text-sm">
                3. Tasks & Team
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: General Info */}
            <TabsContent value="general" className="space-y-6 w-full">
              <div className="enterprise-card p-0 flex flex-col overflow-hidden">
                <div className="p-5 border-b border-border bg-[#0F172A]">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                    Project Details
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5 ml-7">Basic information about the project and client.</p>
                </div>
                
                <div className="p-5 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white block">Client <span className="text-destructive">*</span></label>
                      <Select defaultValue="">
                        <SelectTrigger className="h-[44px] w-full bg-[#0F172A] border-border text-white rounded-[10px] focus:ring-primary transition-all">
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0F172A] border-border text-white rounded-[12px] shadow-xl">
                          <SelectItem value="acme" className="focus:bg-[#172554] focus:text-white cursor-pointer">Acme Corp</SelectItem>
                          <SelectItem value="global" className="focus:bg-[#172554] focus:text-white cursor-pointer">Global Tech LLC</SelectItem>
                          <SelectItem value="nexus" className="focus:bg-[#172554] focus:text-white cursor-pointer">Nexus Dynamics</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white block">Project Name <span className="text-destructive">*</span></label>
                      <input 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Website Redesign Q3" 
                        className="w-full h-[44px] rounded-[10px] bg-[#0F172A] px-3 text-white border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-muted-foreground" 
                        required 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white flex items-center gap-1.5 mb-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-primary" /> Start Date
                      </label>
                      <input type="date" className="w-full h-[44px] rounded-[10px] bg-[#0F172A] px-3 text-white border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all [color-scheme:dark]" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white flex items-center gap-1.5 mb-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" /> End Date (Optional)
                      </label>
                      <input type="date" className="w-full h-[44px] rounded-[10px] bg-[#0F172A] px-3 text-white border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all [color-scheme:dark]" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white block mb-1.5">Project Notes</label>
                    <textarea 
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add details, links, or context for your team..." 
                      className="min-h-[120px] resize-none w-full rounded-[10px] bg-[#0F172A] p-3 text-white border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 pb-10">
                <button type="button" className="btn-primary h-[44px] px-8 shadow-[0_4px_14px_rgba(37,99,235,0.35)]" onClick={() => setActiveTab("billing")}>
                  Continue to Billing
                </button>
              </div>
            </TabsContent>

            {/* TAB 2: Billing & Budget */}
            <TabsContent value="billing" className="space-y-6 w-full">
              <div className="enterprise-card p-0 flex flex-col overflow-hidden">
                <div className="p-5 border-b border-border bg-[#0F172A]">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-success" />
                    Billing Structure
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5 ml-7">Determine how you will bill the client for this project.</p>
                </div>
                
                <div className="p-5 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <label className="relative flex flex-col items-center justify-center p-4 border-2 border-border bg-[#0F172A] rounded-xl cursor-pointer hover:border-primary/50 transition-colors group has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                      <input type="radio" name="projectType" value="hourly" defaultChecked className="sr-only peer" />
                      <span className="font-bold text-white mb-1">Time & Materials</span>
                      <span className="text-xs text-[#CBD5E1] text-center">Bill by the hour</span>
                      <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-primary opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </label>
                    <label className="relative flex flex-col items-center justify-center p-4 border-2 border-border bg-[#0F172A] rounded-xl cursor-pointer hover:border-primary/50 transition-colors group has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                      <input type="radio" name="projectType" value="fixed" className="sr-only peer" />
                      <span className="font-bold text-white mb-1">Fixed Fee</span>
                      <span className="text-xs text-[#CBD5E1] text-center">Set a total price</span>
                      <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-primary opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </label>
                    <label className="relative flex flex-col items-center justify-center p-4 border-2 border-border bg-[#0F172A] rounded-xl cursor-pointer hover:border-primary/50 transition-colors group has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                      <input type="radio" name="projectType" value="non_billable" className="sr-only peer" />
                      <span className="font-bold text-white mb-1">Non-Billable</span>
                      <span className="text-xs text-[#CBD5E1] text-center">Internal / Free</span>
                      <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-primary opacity-0 peer-checked:opacity-100 transition-opacity" />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-border pt-6 mt-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white block">Hourly Rate ($)</label>
                      <input type="number" placeholder="150.00" className="w-full h-[44px] rounded-[10px] bg-[#0F172A] px-3 text-white border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white block">Estimated Budget (Hours)</label>
                      <input type="number" placeholder="100" className="w-full h-[44px] rounded-[10px] bg-[#0F172A] px-3 text-white border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 pb-10">
                <button type="button" className="btn-secondary h-[44px] px-8" onClick={() => setActiveTab("general")}>Back</button>
                <button type="button" className="btn-primary h-[44px] px-8 shadow-[0_4px_14px_rgba(37,99,235,0.35)]" onClick={() => setActiveTab("team")}>Continue to Tasks</button>
              </div>
            </TabsContent>

            {/* TAB 3: Tasks & Team */}
            <TabsContent value="team" className="space-y-6 w-full">
              <div className="enterprise-card p-0 flex flex-col overflow-hidden">
                <div className="p-5 border-b border-border bg-[#0F172A]">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-info" />
                    Tasks & Team
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5 ml-7">Assign specific tasks and select team members for this project.</p>
                </div>
                
                <div className="p-5 space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Select Tasks</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {['Design', 'Development', 'Project Management', 'QA & Testing'].map((task) => (
                        <label key={task} className="flex items-center gap-3 p-3 border border-border rounded-[10px] bg-[#0F172A] hover:bg-[#172554] cursor-pointer transition-colors group has-[:checked]:border-primary/50">
                          <input type="checkbox" defaultChecked className="w-4 h-4 text-primary rounded border-border focus:ring-primary bg-card" />
                          <span className="text-sm font-semibold text-white">{task}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-border pt-6 mt-6">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Assign Team</h3>
                    <div className="space-y-3">
                      {[
                        { name: 'John Doe', role: 'Frontend Developer', init: 'JD', color: 'bg-primary/20 text-info border-primary/30' },
                        { name: 'Alice Smith', role: 'UI/UX Designer', init: 'AS', color: 'bg-success/20 text-success border-success/30' }
                      ].map((member) => (
                        <label key={member.name} className="flex items-center justify-between p-3 border border-border rounded-[10px] bg-[#0F172A] hover:bg-[#172554] cursor-pointer transition-colors group has-[:checked]:border-primary/50">
                          <div className="flex items-center gap-3">
                            <input type="checkbox" defaultChecked className="w-4 h-4 text-primary rounded border-border focus:ring-primary bg-card" />
                            <div className={`h-8 w-8 rounded-full border flex items-center justify-center text-xs font-bold ${member.color}`}>
                              {member.init}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{member.name}</p>
                              <p className="text-xs text-muted-foreground">{member.role}</p>
                            </div>
                          </div>
                          <Settings2 className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
                        </label>
                      ))}
                    </div>
                    <button type="button" className="text-primary text-sm font-semibold px-1 py-2 hover:text-white transition-colors">
                      + Add another team member
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 pb-10">
                <button type="button" className="btn-secondary h-[44px] px-8" onClick={() => setActiveTab("billing")}>Back</button>
                <button 
                  type="submit"
                  disabled={isPending || !name.trim()} 
                  className="btn-primary h-[44px] px-8 shadow-[0_4px_14px_rgba(37,99,235,0.35)]"
                >
                  {isPending ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </TabsContent>

          </Tabs>
        </form>
      </div>
    </div>
  );
}
