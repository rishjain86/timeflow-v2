'use client';

import React, { useState } from 'react';
import { 
  Shield, 
  User, 
  MoreVertical, 
  Plus, 
  CheckCircle2, 
  XCircle,
  Search
} from 'lucide-react';

// Shadcn UI Components
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

// API Hook & Components
import { useGetUsersRoles, UserRoleData } from '@/features/settings/api/get-users-roles';
import { EditUserModal } from '@/features/settings/components/edit-user-modal';
import { ManagePermissionsModal } from '@/features/settings/components/manage-permissions-modal';
import { CreateUserModal } from '@/features/settings/components/create-user-modal';

// Helper for Role Badges
const getRoleBadge = (role: UserRoleData['role']) => {
  switch (role) {
    case 'ADMIN': return <span className="badge-base bg-primary/20 text-primary border border-primary/30">Admin</span>;
    case 'THERAPIST': return <span className="badge-base badge-info">Therapist</span>;
    case 'BILLING': return <span className="badge-base badge-pending">Billing</span>;
    case 'FRONT_DESK': return <span className="badge-base badge-draft">Front Desk</span>;
    default: return <span className="badge-base badge-cancelled">{role}</span>;
  }
};

export default function UsersSettingsPage() {
  const { data: users, isLoading } = useGetUsersRoles();
  
  // Local State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserRoleData | null>(null);
  
  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);

  // Local filtering for smooth UI search
  const filteredUsers = users?.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Handlers
  const handleEditUser = (user: UserRoleData) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleManagePermissions = (user: UserRoleData) => {
    setSelectedUser(user);
    setIsPermissionsModalOpen(true);
  };

  // Shared generic helper to close any modal and safely cleanup the selected user
  const handleCloseModal = (setModalState: React.Dispatch<React.SetStateAction<boolean>>) => {
    setModalState(false);
    setTimeout(() => setSelectedUser(null), 200); // 200ms delay to allow Dialog close animation to finish smoothly
  };

  if (isLoading) {
    return (
      <div className="timeflow-container py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48 bg-muted/20" />
            <Skeleton className="h-4 w-72 mt-2 bg-muted/20" />
          </div>
          <Skeleton className="h-10 w-32 rounded-[10px] bg-muted/20" />
        </div>
        <div className="enterprise-card p-6">
          <Skeleton className="h-[400px] w-full rounded-[16px] bg-muted/20" />
        </div>
      </div>
    );
  }

  return (
    <div className="timeflow-container space-y-6 animate-in fade-in duration-500 py-6">
      
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">User Management & Roles</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage system users, their assigned roles, and application access.
          </p>
        </div>
        <button className="btn-primary shrink-0 w-full sm:w-auto shadow-md" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add New User
        </button>
      </div>

      <div className="enterprise-table-container flex flex-col">
        <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card">
          <div>
            <h2 className="text-lg font-bold text-foreground">System Users</h2>
            <p className="text-sm text-muted-foreground mt-0.5">A list of all users holding access to the ERP.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search users..."
              className="w-full h-[40px] pl-9 pr-3 rounded-[10px] bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="enterprise-table-header">
              <tr>
                <th className="enterprise-table-head pl-6 w-[300px]">User Details</th>
                <th className="enterprise-table-head">Role</th>
                <th className="enterprise-table-head">Status</th>
                <th className="enterprise-table-head">Last Login</th>
                <th className="enterprise-table-head text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user: UserRoleData) => (
                  <tr key={user.id} className="enterprise-table-row group hover:bg-accent/50 transition-colors">
                    <td className="enterprise-table-cell pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center shrink-0 group-hover:border-primary/50 transition-colors">
                          {user.role === 'ADMIN' ? <Shield className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-info" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground group-hover:text-primary transition-colors">{user.name}</span>
                          <span className="text-xs text-muted-foreground mt-0.5">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="enterprise-table-cell">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="enterprise-table-cell">
                      <div className="flex items-center">
                        {user.isActive ? (
                          <span className="badge-base badge-paid flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="badge-base badge-cancelled flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="enterprise-table-cell text-sm text-muted-foreground">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-CA', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      }) : 'Never'}
                    </td>
                    <td className="enterprise-table-cell text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="btn-ghost h-8 w-8 p-0 opacity-80 group-hover:opacity-100 hover:text-foreground rounded-md">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 border-border rounded-[12px] bg-card shadow-xl text-foreground">
                          <DropdownMenuLabel className="text-muted-foreground">Actions</DropdownMenuLabel>
                          
                          <DropdownMenuItem className="cursor-pointer focus:bg-accent focus:text-foreground" onClick={() => handleEditUser(user)}>
                            Edit User Details
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem className="cursor-pointer focus:bg-accent focus:text-foreground" onClick={() => handleManagePermissions(user)}>
                            Manage Permissions
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator className="bg-border" />
                          {user.isActive ? (
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer font-medium transition-colors"
                              onClick={() => handleEditUser(user)}
                            >
                              Suspend Access
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              className="text-success focus:text-success focus:bg-success/10 cursor-pointer font-medium transition-colors"
                              onClick={() => handleEditUser(user)}
                            >
                              Restore Access
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="h-32 text-center text-muted-foreground bg-background">
                    No users found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Render Modals */}
      <CreateUserModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />

      <EditUserModal 
        isOpen={isEditModalOpen} 
        onClose={() => handleCloseModal(setIsEditModalOpen)} 
        user={selectedUser} 
      />
      
      <ManagePermissionsModal 
        isOpen={isPermissionsModalOpen} 
        onClose={() => handleCloseModal(setIsPermissionsModalOpen)} 
        user={selectedUser} 
      />
    </div>
  );
}
