'use client';

import React from 'react';
import { 
  User, 
  Bell, 
  Shield, 
  Save 
} from 'lucide-react';

// Shadcn UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';

// API Hook
import { useGetPatientSettings } from '@/features/patient/api/get-patient-settings';

export default function PatientSettingsPage() {
  const { data, isLoading, isError } = useGetPatientSettings();

  if (isLoading) {
    return (
      <div className="timeflow-container py-6 space-y-8">
        <div>
          <Skeleton className="h-10 w-48 bg-muted/20" />
          <Skeleton className="h-4 w-72 mt-2 bg-muted/20" />
        </div>
        <Skeleton className="h-12 w-full sm:w-[400px] rounded-[12px] bg-muted/20" />
        <Skeleton className="h-[400px] w-full rounded-[16px] bg-muted/20" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="timeflow-container py-20 text-center text-muted-foreground">
        <p className="text-foreground text-lg font-medium">Failed to load settings.</p>
        <p className="mt-1">Please try refreshing.</p>
      </div>
    );
  }

  return (
    <div className="timeflow-container space-y-6 animate-in fade-in duration-500 py-6">
      
      {/* Header Section */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Manage your account preferences, notifications, and security.
        </p>
      </div>

      {/* Tabs for Organization */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full sm:w-[400px] grid-cols-3 mb-6 bg-card border border-border h-[48px] p-1 rounded-[12px]">
          <TabsTrigger value="profile" className="flex gap-2 rounded-[8px] data-[state=active]:bg-accent data-[state=active]:text-foreground text-muted-foreground transition-all">
            <User className="h-4 w-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex gap-2 rounded-[8px] data-[state=active]:bg-accent data-[state=active]:text-foreground text-muted-foreground transition-all">
            <Bell className="h-4 w-4" /> Alerts
          </TabsTrigger>
          <TabsTrigger value="security" className="flex gap-2 rounded-[8px] data-[state=active]:bg-accent data-[state=active]:text-foreground text-muted-foreground transition-all">
            <Shield className="h-4 w-4" /> Security
          </TabsTrigger>
        </TabsList>
        
        {/* PROFILE TAB */}
        <TabsContent value="profile" className="space-y-4">
          <div className="enterprise-card p-0 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-border bg-card">
              <h2 className="text-lg font-bold text-foreground">Personal Information</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Update your contact details and basic information.</p>
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
              </div>
            </div>
            
            <div className="bg-muted/50 border-t border-border p-4 flex justify-end">
              <button className="btn-primary h-[44px] px-5 w-full sm:w-auto shadow-md">
                <Save className="mr-2 h-4 w-4" /> Save Changes
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
                  <label className="text-base font-semibold text-foreground">Appointment Reminders</label>
                  <span className="text-sm text-muted-foreground">Receive SMS and email reminders 24 hours before your session.</span>
                </div>
                <Switch defaultChecked={data.notifications.appointmentReminders} />
              </div>
              <div className="h-px w-full bg-border/50"></div>
              <div className="flex items-center justify-between space-x-2">
                <div className="flex flex-col space-y-1">
                  <label className="text-base font-semibold text-foreground">Billing Alerts</label>
                  <span className="text-sm text-muted-foreground">Get notified when a new invoice is generated or payment is due.</span>
                </div>
                <Switch defaultChecked={data.notifications.billingAlerts} />
              </div>
              <div className="h-px w-full bg-border/50"></div>
              <div className="flex items-center justify-between space-x-2">
                <div className="flex flex-col space-y-1">
                  <label className="text-base font-semibold text-foreground">New Documents</label>
                  <span className="text-sm text-muted-foreground">Receive an email when your provider shares a new file.</span>
                </div>
                <Switch defaultChecked={data.notifications.newDocuments} />
              </div>
            </div>
            
            <div className="bg-muted/50 border-t border-border p-4 flex justify-end">
              <button className="btn-primary h-[44px] px-5 w-full sm:w-auto shadow-md">
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
              <button className="btn-primary h-[44px] px-5 w-full sm:w-auto shadow-md">
                Update Password
              </button>
            </div>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
