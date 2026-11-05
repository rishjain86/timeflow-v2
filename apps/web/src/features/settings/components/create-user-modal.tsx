'use client';

import React, { useState } from 'react';
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
import { useCreateUser } from '@/features/settings/api/use-create-user';
import { RoleType } from '@/features/settings/api/get-users-roles';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateUserModal({ isOpen, onClose }: CreateUserModalProps) {
  // Local Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // Added temporary password if needed by backend schema
  const [role, setRole] = useState<RoleType>('THERAPIST');
  const [isActive, setIsActive] = useState<string>('true');

  const { mutate: createUser, isPending } = useCreateUser();

  // Reset form to default state
  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('THERAPIST');
    setIsActive('true');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    if (!name.trim() || !email.trim()) {
      toast.error('Name and Email are required.');
      return;
    }

    // 🟢 Split full name into firstName and lastName to match backend schema requirements
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || 'User';

    const loadingToast = toast.loading('Creating new user...');
    
    createUser(
      {
        firstName,
        lastName,
        email,
        password: password || 'TempPass123!', // Fallback password if field is missing
        role,
        isActive: isActive === 'true',
      } as any,
      {
        onSuccess: () => {
          toast.success('User created successfully!', { id: loadingToast });
          handleClose();
        },
        onError: (err: any) => {
          const errMsg = err?.response?.data?.message || 'Failed to create user.';
          toast.error(errMsg, { id: loadingToast });
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new system user and assign their initial role.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Full Name</label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g. Jane Doe"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Email Address</label>
            <Input 
              type="email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="e.g. jane@example.com"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Temporary Password</label>
            <Input 
              type="password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Enter initial password"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">System Role</label>
            <Select value={role} onValueChange={(val: RoleType) => setRole(val)} disabled={isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="THERAPIST">Therapist</SelectItem>
                <SelectItem value="BILLING">Billing</SelectItem>
                <SelectItem value="FRONT_DESK">Front Desk</SelectItem>
                <SelectItem value="EMPLOYEE">Employee</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Account Status</label>
            <Select value={isActive} onValueChange={setIsActive} disabled={isPending}>
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
          <Button variant="ghost" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Creating...' : 'Create User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
