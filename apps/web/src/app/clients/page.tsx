'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  MoreVertical, 
  Building2,
  Mail,
  Phone,
  Trash2,
  Edit2
} from 'lucide-react';
import { useTheme } from 'next-themes';
import toast from 'react-hot-toast';

import { NewClientModal } from '@/components/clients/NewClientModal';
import { EditClientModal } from '@/components/clients/EditClientModal'; 

import { useClients } from '@/features/clients/api/get-clients'; 
import { useDeleteClient } from '@/features/clients/api/delete-client'; 
import { useOrganization } from '@/features/organizations/api/get-organization'; // 🟢 NEW: Fetched for feature toggling

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState('');
   
  // Modals ka state manage karne ke liye
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  const { data: currentOrganization } = useOrganization(); // 🟢 NEW: Get current org context
  const isHealthcare = currentOrganization?.industryType === 'HEALTHCARE'; // 🟢 Feature Toggle Flag

  // 🟢 DASHBOARD WALI TRICK: For solid background native select dropdown options
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const solidMenuBg = isDark ? '#1E293B' : '#ffffff'; 
  const solidText = isDark ? '#ffffff' : '#0F172A';

  // APIs call karne ke liye hooks
  const { data: clients = [], isLoading } = useClients();
  const { mutate: deleteClient } = useDeleteClient(); 

  // Search filter apply karna
  const filteredClients = clients.filter((client: any) => 
    client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 🟢 The Fix for Logout on Delete: Wrapped in Try-Catch & Success/Error Callbacks
  const handleDelete = (clientId: string, clientName: string) => {
    if (window.confirm(`Are you sure you want to delete ${clientName}?`)) {
      deleteClient(clientId, {
        onSuccess: () => {
          toast.success(`${clientName} has been successfully deleted.`);
        },
        onError: (error: any) => {
          // System won't crash/logout now. We handle it gracefully here.
          console.error("Delete failed:", error);
          toast.error(error?.response?.data?.message || 'Failed to delete. The system prevented an unexpected logout.');
        }
      });
    }
  };

  // Edit action function
  const handleEditClick = (client: any) => {
    setSelectedClient(client);
    setIsEditModalOpen(true);
  };

  return (
    <div className="timeflow-container space-y-6 animate-in fade-in duration-500 py-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {isHealthcare ? 'Payors / Case Owners' : 'Clients'}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {isHealthcare 
              ? 'Manage your healthcare payors, insurance, and contact details.' 
              : 'Manage your client organizations and contact details.'}
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary shrink-0 w-full sm:w-auto flex items-center justify-center"
        >
          <Plus className="w-4 h-4 mr-2" /> Add {isHealthcare ? 'Payor' : 'Client'}
        </button>
      </div>

      {/* Toolbar: Search */}
      <div className="enterprise-card p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${isHealthcare ? 'payors by name or company' : 'clients by name or company'}...`} 
            className="input-field pl-9 bg-background text-foreground border-border"
          />
        </div>
      </div>

      {/* Enterprise Data Table */}
      <div className="enterprise-table-container">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="enterprise-table-header">
              <tr>
                <th className="enterprise-table-head w-[35%] pl-6">{isHealthcare ? 'Payor / Company' : 'Client / Company'}</th>
                <th className="enterprise-table-head">Contact Info</th>
                <th className="enterprise-table-head">Status</th>
                <th className="enterprise-table-head text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-muted-foreground bg-background">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                      Loading {isHealthcare ? 'payors' : 'clients'}...
                    </div>
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-muted-foreground bg-background">
                    No {isHealthcare ? 'payors' : 'clients'} found. Click "Add {isHealthcare ? 'Payor' : 'Client'}" to create one.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client: any) => (
                  <tr key={client.id} className="enterprise-table-row group hover:bg-accent/50 transition-colors">
                    
                    {/* Client & Company */}
                    <td className="enterprise-table-cell pl-6">
                      <div className="font-semibold text-foreground text-base group-hover:text-info transition-colors">{client.companyName || client.name}</div>
                      <div className="flex items-center text-xs text-muted-foreground mt-1 gap-1.5 font-medium">
                        <Building2 className="w-3.5 h-3.5" />
                        {client.name} (Primary Contact)
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="enterprise-table-cell">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center text-sm text-muted-foreground gap-2 group-hover:text-foreground transition-colors">
                          <Mail className="w-3.5 h-3.5" /> {client.email || 'N/A'}
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground gap-2 group-hover:text-foreground transition-colors">
                          <Phone className="w-3.5 h-3.5" /> {client.phone || 'N/A'}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="enterprise-table-cell">
                      <span className={`badge-base ${client.isActive !== false ? 'badge-paid' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                        {client.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="enterprise-table-cell text-right pr-6">
                      {/* 🟢 THE BULLETPROOF INVISIBLE SELECT HACK for Clients 🟢 */}
                      <div className="relative flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent transition-colors float-right">
                        <MoreVertical className="absolute w-5 h-5 text-muted-foreground pointer-events-none" style={{ zIndex: 1 }} />
                        <select
                          title="Actions"
                          className="absolute inset-0 w-full h-full cursor-pointer dark:[color-scheme:dark]"
                          style={{ opacity: 0, appearance: 'none', WebkitAppearance: 'none', zIndex: 10 }}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === 'edit') handleEditClick(client);
                            if (val === 'delete') handleDelete(client.id, client.companyName || client.name);
                            e.target.value = 'default';
                          }}
                          defaultValue="default"
                        >
                          <option value="default" disabled hidden>⚙️ Actions</option>
                          <option value="edit" style={{ backgroundColor: solidMenuBg, color: solidText }}>✏️ Edit {isHealthcare ? 'Payor' : 'Client'}</option>
                          <option value="delete" style={{ backgroundColor: solidMenuBg, color: solidText }}>🗑️ Delete</option>
                        </select>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Client Modal */}
      <NewClientModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Edit Client Modal */}
      <EditClientModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedClient(null);
        }}
        clientData={selectedClient}
      />
      
    </div>
  );
}
