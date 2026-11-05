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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// API Hook & Types
import { useUpdateUser } from '@/features/settings/api/use-update-user';
import { UserRoleData, RoleType } from '@/features/settings/api/get-users-roles';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserRoleData | null;
}

export function EditUserModal({ isOpen, onClose, user }: EditUserModalProps) {
  // Local Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState<RoleType>('THERAPIST');
  const [isActive, setIsActive] = useState<string>('true');

  const { mutate: updateUser, isPending } = useUpdateUser();

  // Pre-fill form when modal opens with a selected user
  useEffect(() => {
    if (user && isOpen) {
      setName(user.name);
      setRole(user.role);
      setIsActive(user.isActive ? 'true' : 'false');
    }
  }, [user, isOpen]);

  const handleSubmit = () => {
    if (!user) return;
    
    if (!name.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }

    const loadingToast = toast.loading('Updating user details...');
    
    updateUser(
      {
        id: user.id,
        name,
        role,
        isActive: isActive === 'true',
      },
      {
        onSuccess: () => {
          toast.success('User updated successfully!', { id: loadingToast });
          onClose();
        },
        onError: () => {
          toast.error('Failed to update user.', { id: loadingToast });
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User Profile</DialogTitle>
          <DialogDescription>
            Update role and access settings for {user?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Full Name</label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. John Doe"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">System Role</label>
            <Select value={role} onValueChange={(val: RoleType) => setRole(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="THERAPIST">Therapist</SelectItem>
                <SelectItem value="BILLING">Billing</SelectItem>
                <SelectItem value="FRONT_DESK">Front Desk</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Account Status</label>
            <Select value={isActive} onValueChange={setIsActive}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active (Has Access)</SelectItem>
                <SelectItem value="false">Inactive (Suspended)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
