'use client';

import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, Clock, FileText, Loader2 } from 'lucide-react';
import { useComplianceStatus } from '../api/get-compliance-status';

interface ComplianceChecklistProps {
  appointmentId: string;
}

export function ComplianceChecklist({ appointmentId }: ComplianceChecklistProps) {
  const { data: status, isLoading, isError } = useComplianceStatus(appointmentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 bg-card rounded-[16px] border border-border">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !status) {
    return (
      <div className="p-4 rounded-[12px] bg-destructive/10 border border-destructive/20 text-destructive text-sm flex gap-2 items-start">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <p>Failed to load compliance status. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-[16px] p-5 space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
        <FileText className="w-4 h-4 text-primary" />
        Clinical Compliance Checklist
      </h3>

      <div className="space-y-4">
        {/* Attendance Status */}
        <div className="flex items-start justify-between gap-4 p-3 rounded-[12px] bg-background border border-border">
          <div className="flex items-start gap-3">
            {status.attendanceComplete ? (
              <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
            ) : status.attendanceUploaded ? (
              <Clock className="w-5 h-5 text-warning shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-destructive shrink-0" />
            )}
            <div>
              <p className="text-sm font-semibold text-foreground">Attendance Record</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {status.attendanceComplete 
                  ? 'Present/Late verified' 
                  : status.attendanceUploaded 
                    ? 'Uploaded, pending review' 
                    : 'Missing or marked as absent'}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className={`px-2 py-1 rounded text-[10px] font-bold border ${
              status.attendanceComplete 
                ? 'bg-success/10 text-success border-success/20' 
                : status.attendanceUploaded
                  ? 'bg-warning/10 text-warning border-warning/20'
                  : 'bg-destructive/10 text-destructive border-destructive/20'
            }`}>
              {status.attendanceStatus || 'PENDING'}
            </span>
          </div>
        </div>

        {/* Clinical Note Status */}
        <div className="flex items-start justify-between gap-4 p-3 rounded-[12px] bg-background border border-border">
          <div className="flex items-start gap-3">
            {status.clinicalNoteComplete ? (
              <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
            ) : status.clinicalNoteUploaded ? (
              <Clock className="w-5 h-5 text-warning shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-destructive shrink-0" />
            )}
            <div>
              <p className="text-sm font-semibold text-foreground">Clinical Note</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {status.clinicalNoteComplete 
                  ? 'Note approved by supervisor' 
                  : status.clinicalNoteUploaded 
                    ? 'Note drafted, pending approval' 
                    : 'No clinical note found'}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className={`px-2 py-1 rounded text-[10px] font-bold border ${
              status.clinicalNoteComplete 
                ? 'bg-success/10 text-success border-success/20' 
                : status.clinicalNoteUploaded
                  ? 'bg-warning/10 text-warning border-warning/20'
                  : 'bg-destructive/10 text-destructive border-destructive/20'
            }`}>
              {status.clinicalNoteStatus || 'MISSING'}
            </span>
          </div>
        </div>
      </div>

      {/* Submission Blocker Warning */}
      {!status.canSubmitTreatment && (
        <div className="mt-2 p-3 rounded-[12px] bg-warning/10 border border-warning/20 text-warning text-xs flex gap-2 items-start">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <div>
            <p className="font-semibold mb-1">Time Entry Blocked</p>
            <p className="opacity-90">
              Treatment time cannot be submitted until the following requirements are met: 
              <span className="font-semibold"> {status.missingRequirements?.join(', ')}</span>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
