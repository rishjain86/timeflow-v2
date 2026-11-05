'use client';

import React from 'react';
import { 
  User, 
  Clock, 
  Bell, 
  Shield, 
  Save 
} from 'lucide-react';

// Shadcn UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

// API Hook
import { useGetProviderSettings } from '@/features/provider/api/get-provider-settings';

export default function ProviderSettingsPage() {
  const { data, isLoading, isError } = useGetProviderSettings();

  if (isLoading) {
    return (
      <div className="timeflow-container py-6 space-y-8">
        <div>
          <Skeleton className="h-10 w-64 bg-muted/20" />
          <Skeleton className="h-4 w-96 mt-2 bg-muted/20" />
        </div>
        <Skeleton className="h-[48px] w-full sm:w-[500px] rounded-[12px] bg-muted/20" />
        <div className="enterprise-card p-0 overflow-hidden">
          <div className="p-5 border-b border-border bg-card">
            <Skeleton className="h-6 w-48 mb-2 bg-muted/20" />
            <Skeleton className="h-4 w-72 bg-muted/20" />
          </div>
          <div className="p-6">
            <Skeleton className="h-[300px] w-full bg-muted/25" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="timeflow-container py-20 text-center text-muted-foreground">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Failed to load settings</h2>
        <p className="mt-2 text-sm sm:text-base">Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="timeflow-container space-y-6 animate-in fade-in duration-500 py-6">
      
      {/* Header Section */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Settings & Profile</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Manage your clinical profile, availability defaults, and account preferences.
        </p>
      </div>

      {/* Tabs for Organization */}
      <Tabs defaultValue="profile" className="w-full">
        <div className="overflow-x-auto pb-2 mb-4 custom-scrollbar">
          <TabsList className="inline-flex w-full sm:w-auto bg-card border border-border h-[48px] p-1 rounded-[12px] gap-1">
            <TabsTrigger value="profile" className="flex gap-2 rounded-[8px] data-[state=active]:bg-accent data-[state=active]:text-foreground text-muted-foreground transition-all px-4 text-xs sm:text-sm font-semibold">
              <User className="h-4 w-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="availability" className="flex gap-2 rounded-[8px] data-[state=active]:bg-accent data-[state=active]:text-foreground text-muted-foreground transition-all px-4 text-xs sm:text-sm font-semibold">
              <Clock className="h-4 w-4" /> Availability
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex gap-2 rounded-[8px] data-[state=active]:bg-accent data-[state=active]:text-foreground text-muted-foreground transition-all px-4 text-xs sm:text-sm font-semibold">
              <Bell className="h-4 w-4" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="flex gap-2 rounded-[8px] data-[state=active]:bg-accent data-[state=active]:text-foreground text-muted-foreground transition-all px-4 text-xs sm:text-sm font-semibold">
              <Shield className="h-4 w-4" /> Security
            </TabsTrigger>
          </TabsList>
        </div>
        
        {/* PROFILE TAB */}
        <TabsContent value="profile" className="space-y-4">
          <div className="enterprise-card p-0 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border bg-card">
              <h2 className="text-lg font-bold text-foreground">Clinical Profile</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Update your professional information and contact details.</p>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="firstName" className="text-sm font-medium text-foreground mb-1.5 block">First Name</label>
                  <input id="firstName" defaultValue={data.profile.firstName} className="w-full h-[44px] rounded-[10px] bg-background px-3 text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm" />
                </div>
                <div>
                  <label htmlFor="lastName" className="text-sm font-medium text-foreground mb-1.5 block">Last Name</label>
                  <input id="lastName" defaultValue={data.profile.lastName} className="w-full h-[44px] rounded-[10px] bg-background px-3 text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm" />
                </div>
                <div>
                  <label htmlFor="email" className="text-sm font-medium text-foreground mb-1.5 block">Email Address</label>
                  <input id="email" type="email" defaultValue={data.profile.email} className="w-full h-[44px] rounded-[10px] bg-background px-3 text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm" />
                </div>
                <div>
                  <label htmlFor="phone" className="text-sm font-medium text-foreground mb-1.5 block">Phone Number</label>
                  <input id="phone" type="tel" defaultValue={data.profile.phone} className="w-full h-[44px] rounded-[10px] bg-background px-3 text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm" />
                </div>
                <div>
                  <label htmlFor="title" className="text-sm font-medium text-foreground mb-1.5 block">Professional Title</label>
                  <input id="title" defaultValue={data.profile.title} className="w-full h-[44px] rounded-[10px] bg-background px-3 text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm" />
                </div>
                <div>
                  <label htmlFor="npi" className="text-sm font-medium text-foreground mb-1.5 block">NPI Number</label>
                  <input id="npi" defaultValue={data.profile.npi} className="w-full h-[44px] rounded-[10px] bg-background px-3 text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm" />
                </div>
              </div>
            </div>

            <div className="bg-muted/50 border-t border-border p-4 flex justify-end">
              <button className="btn-primary h-[44px] px-6 w-full sm:w-auto shadow-md">
                <Save className="mr-2 h-4 w-4" /> Save Profile
              </button>
            </div>
          </div>
        </TabsContent>

        {/* AVAILABILITY TAB */}
        <TabsContent value="availability" className="space-y-4">
          <div className="enterprise-card p-0 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border bg-card">
              <h2 className="text-lg font-bold text-foreground">Schedule & Availability</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Set your default timezone and patient intake status.</p>
            </div>

            <div className="p-5 space-y-6">
              <div className="space-y-2 max-w-md">
                <label className="text-sm font-medium text-foreground block">Timezone</label>
                <Select defaultValue={data.availability.timezone}>
                  <SelectTrigger className="h-[44px] w-full bg-background border-border text-foreground rounded-[10px] focus:ring-primary transition-all shadow-sm">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-foreground rounded-[12px] shadow-xl">
                    <SelectItem value="America/New_York" className="focus:bg-accent focus:text-foreground cursor-pointer">Eastern Time (ET)</SelectItem>
                    <SelectItem value="America/Chicago" className="focus:bg-accent focus:text-foreground cursor-pointer">Central Time (CT)</SelectItem>
                    <SelectItem value="America/Denver" className="focus:bg-accent focus:text-foreground cursor-pointer">Mountain Time (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles" className="focus:bg-accent focus:text-foreground cursor-pointer">Pacific Time (PT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between space-x-2 border-t border-border pt-6 max-w-xl">
                <div className="flex flex-col space-y-1">
                  <label className="text-base font-semibold text-foreground">Accepting New Patients</label>
                  <span className="text-sm text-muted-foreground">Allow new patients to book initial consultations.</span>
                </div>
                <Switch defaultChecked={data.availability.acceptingNewPatients} />
              </div>
            </div>

            <div className="bg-muted/50 border-t border-border p-4 flex justify-end">
              <button className="btn-primary h-[44px] px-6 w-full sm:w-auto shadow-md">
                <Save className="mr-2 h-4 w-4" /> Save Schedule Defaults
              </button>
            </div>
          </div>
        </TabsContent>

        {/* NOTIFICATIONS TAB */}
        <TabsContent value="notifications" className="space-y-4">
          <div className="enterprise-card p-0 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border bg-card">
              <h2 className="text-lg font-bold text-foreground">Notification Preferences</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Choose what updates you want to receive and how.</p>
            </div>

            <div className="p-5 space-y-6">
              <div className="flex items-center justify-between space-x-2">
                <div className="flex flex-col space-y-1">
                  <label className="text-base font-semibold text-foreground">New Appointments</label>
                  <span className="text-sm text-muted-foreground">Get notified when a patient schedules a new session.</span>
                </div>
                <Switch defaultChecked={data.notifications.newAppointments} />
              </div>
              <div className="h-px w-full bg-border/50"></div>
              <div className="flex items-center justify-between space-x-2">
                <div className="flex flex-col space-y-1">
                  <label className="text-base font-semibold text-foreground">Cancellations</label>
                  <span className="text-sm text-muted-foreground">Receive an alert if a session is cancelled or rescheduled.</span>
                </div>
                <Switch defaultChecked={data.notifications.cancellations} />
              </div>
              <div className="h-px w-full bg-border/50"></div>
              <div className="flex items-center justify-between space-x-2">
                <div className="flex flex-col space-y-1">
                  <label className="text-base font-semibold text-foreground">Daily Summary</label>
                  <span className="text-sm text-muted-foreground">Receive an email every morning with your schedule for the day.</span>
                </div>
                <Switch defaultChecked={data.notifications.dailySummary} />
              </div>
            </div>

            <div className="bg-muted/50 border-t border-border p-4 flex justify-end">
              <button className="btn-primary h-[44px] px-6 w-full sm:w-auto shadow-md">
                <Save className="mr-2 h-4 w-4" /> Save Preferences
              </button>
            </div>
          </div>
        </TabsContent>

        {/* SECURITY TAB */}
        <TabsContent value="security" className="space-y-4">
          <div className="enterprise-card p-0 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border bg-card">
              <h2 className="text-lg font-bold text-foreground">Password & Security</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Manage your password and secure your account.</p>
            </div>

            <div className="p-5 space-y-5 max-w-xl">
              <div>
                <label htmlFor="current-password" className="text-sm font-medium text-foreground mb-1.5 block">Current Password</label>
                <input id="current-password" type="password" className="w-full h-[44px] rounded-[10px] bg-background px-3 text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm" />
              </div>
              <div>
                <label htmlFor="new-password" className="text-sm font-medium text-foreground mb-1.5 block">New Password</label>
                <input id="new-password" type="password" className="w-full h-[44px] rounded-[10px] bg-background px-3 text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm" />
              </div>
              <div>
                <label htmlFor="confirm-password" className="text-sm font-medium text-foreground mb-1.5 block">Confirm New Password</label>
                <input id="confirm-password" type="password" className="w-full h-[44px] rounded-[10px] bg-background px-3 text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary transition-all text-sm" />
              </div>
            </div>

            <div className="bg-muted/50 border-t border-border p-4 flex justify-end">
              <button className="btn-primary h-[44px] px-6 w-full sm:w-auto shadow-md">
                Update Password
              </button>
            </div>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
