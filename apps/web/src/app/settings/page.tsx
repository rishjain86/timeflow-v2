'use client';

import { useEffect, useState } from 'react';
import { useOrganization } from '@/features/organizations/api/get-organization';
import { useUpdateOrganization } from '@/features/organizations/api/update-organization';

export default function OrganizationSettingsPage() {
  const { data: organization, isLoading } = useOrganization();
  const updateMutation = useUpdateOrganization();

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    defaultCurrency: 'USD',
    taxRate: 0,
    invoicePrefix: 'INV-',
    timeZone: 'UTC',
    industryType: 'GENERAL', // 🟢 NEW: Added industryType for Chameleon Effect SaaS Toggle
  });

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        companyName: organization.companyName || '',
        email: organization.email || '',
        phone: organization.phone || '',
        website: organization.website || '',
        address: organization.address || '',
        defaultCurrency: organization.defaultCurrency || 'USD',
        taxRate: organization.taxRate ? Number(organization.taxRate) : 0,
        invoicePrefix: organization.invoicePrefix || 'INV-',
        timeZone: organization.timeZone || 'UTC',
        industryType: organization.industryType || 'GENERAL', // 🟢 Sync industry type
      });
    }
  }, [organization]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync(formData);
      alert('Organization settings updated successfully! 🎉');
      window.location.reload(); // Refresh to immediately apply industry toggle changes across UI
    } catch (error) {
      console.error('Failed to update settings:', error);
      alert('Failed to update settings.');
    }
  };

  if (isLoading) {
    return <div className="p-6 text-muted-foreground animate-pulse">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Organization Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your company profile, billing, and industry workspace preferences.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Company Profile Section */}
        <div className="bg-card p-6 rounded-[16px] shadow-sm border border-border">
          <h2 className="text-lg font-semibold text-foreground border-b border-border pb-4 mb-4">Company Profile</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Organization Name (Internal)</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-[10px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
            
            {/* 🟢 NEW FIELD: INDUSTRY TYPE TOGGLE IN SETTINGS */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Industry Workspace Type</label>
              <select
                name="industryType"
                value={formData.industryType}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-[10px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
              >
                <option value="GENERAL" className="bg-card">General Business (IT, Agency, Consulting)</option>
                <option value="HEALTHCARE" className="bg-card">Healthcare & Therapy Clinics</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Legal Company Name</label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-[10px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Contact Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-[10px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Phone Number</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-[10px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">Company Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-[10px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">Website URL</label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-[10px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Financial & Localization Section */}
        <div className="bg-card p-6 rounded-[16px] shadow-sm border border-border">
          <h2 className="text-lg font-semibold text-foreground border-b border-border pb-4 mb-4">Financial & Localization</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Default Currency Code</label>
              <input
                type="text"
                name="defaultCurrency"
                value={formData.defaultCurrency}
                onChange={handleChange}
                maxLength={3}
                placeholder="USD, INR, EUR"
                className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-[10px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Default Tax Rate (%)</label>
              <input
                type="number"
                name="taxRate"
                value={formData.taxRate}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-[10px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Invoice Prefix</label>
              <input
                type="text"
                name="invoicePrefix"
                value={formData.invoicePrefix}
                onChange={handleChange}
                placeholder="INV-"
                className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-[10px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Timezone</label>
              <select
                name="timeZone"
                value={formData.timeZone}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-background border border-border text-foreground rounded-[10px] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              >
                <option value="UTC" className="bg-card">UTC (Universal Time)</option>
                <option value="Asia/Kolkata" className="bg-card">Asia/Kolkata (IST)</option>
                <option value="America/New_York" className="bg-card">America/New_York (EST)</option>
                <option value="Europe/London" className="bg-card">Europe/London (GMT)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-[10px] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
