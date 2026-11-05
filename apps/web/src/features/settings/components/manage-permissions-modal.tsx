'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// Shadcn UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// API Hook & Types
import { useUpdatePermissions } from '@/features/settings/api/use-update-permissions';
import { UserRoleData, UserPermission } from '@/features/settings/api/get-users-roles';

interface ManagePermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserRoleData | null;
}

// Default modules if a user has no permissions set yet
const DEFAULT_MODULES = ['APPOINTMENTS', 'BILLING', 'AUTHORIZATIONS', 'SETTINGS'];

export function ManagePermissionsModal({ isOpen, onClose, user }: ManagePermissionsModalProps) {
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const { mutate: updatePermissions, isPending } = useUpdatePermissions();

  // Initialize permissions state when modal opens
  useEffect(() => {
    if (user && isOpen) {
      if (user.permissions && user.permissions.length > 0) {
        setPermissions(user.permissions);
      } else {
        // Fallback to default structure if none exist
        const defaultPerms: UserPermission[] = DEFAULT_MODULES.map((module) => ({
          id: `temp-${module.toLowerCase()}`,
          module,
          canRead: false,
          canWrite: false,
          canDelete: false,
        }));
        setPermissions(defaultPerms);
      }
    }
  }, [user, isOpen]);

  const handleToggle = (moduleId: string, field: keyof Omit<UserPermission, 'id' | 'module'>) => {
    setPermissions((prev) =>
      prev.map((perm) =>
        perm.id === moduleId ? { ...perm, [field]: !perm[field] } : perm
      )
    );
  };

  const handleSubmit = () => {
    if (!user) return;

    const loadingToast = toast.loading('Updating permissions...');
    
    updatePermissions(
      {
        userId: user.id,
        permissions,
      },
      {
        onSuccess: () => {
          toast.success('Permissions updated successfully!', { id: loadingToast });
          onClose();
        },
        onError: () => {
          toast.error('Failed to update permissions.', { id: loadingToast });
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Manage Access Permissions</DialogTitle>
          <DialogDescription>
            Configure Read, Write, and Delete access for {user?.name} ({user?.role})
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold text-gray-900">Module</TableHead>
                  <TableHead className="text-center font-semibold text-gray-900">Read</TableHead>
                  <TableHead className="text-center font-semibold text-gray-900">Write</TableHead>
                  <TableHead className="text-center font-semibold text-gray-900">Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((perm) => (
                  <TableRow key={perm.id}>
                    <TableCell className="font-medium text-sm text-gray-700">
                      {perm.module.charAt(0) + perm.module.slice(1).toLowerCase()}
                    </TableCell>
                    <TableCell className="text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 accent-primary cursor-pointer"
                        checked={perm.canRead}
                        onChange={() => handleToggle(perm.id, 'canRead')}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 accent-primary cursor-pointer"
                        checked={perm.canWrite}
                        onChange={() => handleToggle(perm.id, 'canWrite')}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 accent-primary cursor-pointer"
                        checked={perm.canDelete}
                        onChange={() => handleToggle(perm.id, 'canDelete')}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Permissions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
