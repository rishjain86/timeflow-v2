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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface BookSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BookSessionModal({ isOpen, onClose }: BookSessionModalProps) {
  // Local Form State
  const [provider, setProvider] = useState('');
  const [sessionType, setSessionType] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [modality, setModality] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal closes
  const handleClose = () => {
    setProvider('');
    setSessionType('');
    setDate('');
    setTime('');
    setModality('');
    onClose();
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!provider || !sessionType || !date || !time || !modality) {
      toast.error('Please fill in all the fields to book a session.');
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Sending booking request...');

    // Simulate API call delay
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success('Session request sent successfully!', { id: loadingToast });
      handleClose();
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Book a New Session</DialogTitle>
          <DialogDescription>
            Request a new appointment with your preferred provider. We will confirm your time slot shortly.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Provider</label>
            <Select value={provider} onValueChange={setProvider} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Select a therapist" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dr_emily">Dr. Emily Chen</SelectItem>
                <SelectItem value="dr_sarah">Dr. Sarah Smith</SelectItem>
                <SelectItem value="dr_michael">Dr. Michael Torres</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Session Type</label>
            <Select value={sessionType} onValueChange={setSessionType} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="Select session type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consultation">Initial Consultation (30 min)</SelectItem>
                <SelectItem value="cbt">Cognitive Behavioral Therapy (45 min)</SelectItem>
                <SelectItem value="followup">Standard Follow-up (45 min)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Preferred Date</label>
              {/* Using native date input for robust cross-browser support during scaffold */}
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                disabled={isSubmitting}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Preferred Time</label>
              <Select value={time} onValueChange={setTime} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Time slot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning (9 AM - 12 PM)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (1 PM - 4 PM)</SelectItem>
                  <SelectItem value="evening">Evening (5 PM - 7 PM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Session Modality</label>
            <Select value={modality} onValueChange={setModality} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue placeholder="How would you like to meet?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="telehealth">Telehealth (Video Call)</SelectItem>
                <SelectItem value="in_person">In-Person (Clinic)</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Requesting...' : 'Request Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
