'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { PlayCircle, CheckCircle, XCircle, UserX } from 'lucide-react';

// Shadcn UI
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// API & Types
import { useUpdateAppointmentStatus } from '@/features/appointments/api/use-update-appointment-status';
import { AppointmentStatus } from '@/features/calendar/api/get-calendar-appointments';

// SPRINT 6: Compliance
import { ComplianceChecklist } from './ComplianceChecklist';

interface AppointmentActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  clientName: string;
  currentStatus: AppointmentStatus;
}

export const AppointmentActionModal: React.FC<AppointmentActionModalProps> = ({
  isOpen,
  onClose,
  appointmentId,
  clientName,
  currentStatus,
}) => {
  const [targetStatus, setTargetStatus] = useState<AppointmentStatus | null>(null);
  const [notes, setNotes] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');

  const { mutate: updateStatus, isPending } = useUpdateAppointmentStatus();

  // Reset state when opening/closing
  React.useEffect(() => {
    if (isOpen) {
      setTargetStatus(null);
      setNotes('');
      setCancellationReason('');
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!targetStatus) return;

    // Validation
    if (targetStatus === 'COMPLETED' && !notes.trim()) {
      toast.error('Session notes are required to complete an appointment.');
      return;
    }
    if ((targetStatus === 'CANCELLED' || targetStatus === 'NO_SHOW') && !cancellationReason) {
      toast.error('Please provide a reason.');
      return;
    }

    const loadingToast = toast.loading('Updating workflow...');
    
    updateStatus(
      {
        id: appointmentId,
        status: targetStatus,
        notes: targetStatus === 'COMPLETED' ? notes : undefined,
        cancellationReason: (targetStatus === 'CANCELLED' || targetStatus === 'NO_SHOW') ? cancellationReason : undefined,
      },
      {
        onSuccess: () => {
          toast.success(`Appointment marked as ${targetStatus.replace('_', ' ')}`, { id: loadingToast });
          onClose();
        },
        onError: () => {
          toast.error('Failed to update appointment', { id: loadingToast });
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Appointment</DialogTitle>
          <DialogDescription>
            Manage the workflow for {clientName}'s session.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {!targetStatus ? (
            // Step 1: Select the Action
            <div className="flex flex-col gap-3">
              {currentStatus === 'SCHEDULED' && (
                <Button variant="outline" className="justify-start h-12" onClick={() => setTargetStatus('IN_PROGRESS')}>
                  <PlayCircle className="mr-2 h-5 w-5 text-blue-500" /> Check-In / Start Session
                </Button>
              )}
              {currentStatus === 'IN_PROGRESS' && (
                <Button variant="outline" className="justify-start h-12" onClick={() => setTargetStatus('COMPLETED')}>
                  <CheckCircle className="mr-2 h-5 w-5 text-green-500" /> Complete Session
                </Button>
              )}
              {(currentStatus === 'SCHEDULED' || currentStatus === 'IN_PROGRESS') && (
                <>
                  <Button variant="outline" className="justify-start h-12" onClick={() => setTargetStatus('NO_SHOW')}>
                    <UserX className="mr-2 h-5 w-5 text-orange-500" /> Mark as No Show
                  </Button>
                  <Button variant="outline" className="justify-start h-12 border-red-200 hover:bg-red-50 hover:text-red-600" onClick={() => setTargetStatus('CANCELLED')}>
                    <XCircle className="mr-2 h-5 w-5 text-red-500" /> Cancel Appointment
                  </Button>
                </>
              )}
            </div>
          ) : (
            // Step 2: Fill required details based on selected action
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">
                  Action: {targetStatus.replace('_', ' ')}
                </h4>
                <Button variant="ghost" size="sm" onClick={() => setTargetStatus(null)} className="h-6 text-xs">
                  Change
                </Button>
              </div>

              {targetStatus === 'COMPLETED' && (
                <div className="space-y-4">
                  {/* SPRINT 6: Display Compliance Checklist before completing */}
                  <ComplianceChecklist appointmentId={appointmentId} />
                  
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Session Notes (Required)</label>
                    <Textarea 
                      placeholder="Enter objective notes, interventions used, and client responses..." 
                      className="min-h-[120px]"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {(targetStatus === 'CANCELLED' || targetStatus === 'NO_SHOW') && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Reason (Required)</label>
                  <Select value={cancellationReason} onValueChange={setCancellationReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client_sick">Client Sick</SelectItem>
                      <SelectItem value="therapist_unavailable">Therapist Unavailable</SelectItem>
                      <SelectItem value="transportation_issue">Transportation Issue</SelectItem>
                      <SelectItem value="no_show">Client Did Not Show</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {targetStatus === 'IN_PROGRESS' && (
                <p className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-md border border-blue-100">
                  You are about to check-in this client and start the session timer. Are you sure you want to proceed?
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>Cancel</Button>
          {targetStatus && (
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Saving...' : 'Confirm Update'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
