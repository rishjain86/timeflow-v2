'use client';

import React, { useState } from 'react';
import { FileText, Save, Loader2, CheckCircle } from 'lucide-react';
import { useCreateClinicalNote } from '../api/create-clinical-note';

interface ClinicalNoteFormProps {
  appointmentId: string;
  clientId: string;
  onSuccess?: () => void;
}

export function ClinicalNoteForm({ appointmentId, clientId, onSuccess }: ClinicalNoteFormProps) {
  const [content, setContent] = useState('');
  const [interventions, setInterventions] = useState('');
  const [progress, setProgress] = useState<'IMPROVING' | 'MAINTAINING' | 'DECLINING' | ''>('');
  
  const { mutate: createNote, isPending } = useCreateClinicalNote();

  const handleSubmit = (e: React.FormEvent, isDraft: boolean = false) => {
    e.preventDefault();
    if (!content.trim()) return;

    createNote({
      appointmentId,
      clientId,
      content,
      interventions,
      progress: progress || undefined,
      isDraft
    }, {
      onSuccess: () => {
        if (onSuccess) onSuccess();
      }
    });
  };

  return (
    <form className="space-y-6 bg-card p-6 rounded-[16px] border border-border" onSubmit={(e) => handleSubmit(e, false)}>
      <div className="flex items-center gap-2 border-b border-border pb-4">
        <FileText className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-white">Session Clinical Note</h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#CBD5E1]">Session Observations / Notes <span className="text-destructive">*</span></label>
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isPending}
            required
            rows={5}
            placeholder="Document objective observations, client behavior, and session details..." 
            className="w-full p-3 rounded-[12px] border border-border bg-[#0F172A] text-white placeholder:text-[#64748B] text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#CBD5E1]">Interventions Used</label>
          <textarea 
            value={interventions}
            onChange={(e) => setInterventions(e.target.value)}
            disabled={isPending}
            rows={2}
            placeholder="e.g. CBT techniques, grounding exercises..." 
            className="w-full p-3 rounded-[12px] border border-border bg-[#0F172A] text-white placeholder:text-[#64748B] text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#CBD5E1]">Client Progress</label>
          <select 
            value={progress}
            onChange={(e) => setProgress(e.target.value as any)}
            disabled={isPending}
            className="w-full h-[44px] px-3 rounded-[12px] border border-border bg-[#0F172A] text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all cursor-pointer disabled:opacity-50"
          >
            <option value="" className="text-muted-foreground">Select progress...</option>
            <option value="IMPROVING">Improving</option>
            <option value="MAINTAINING">Maintaining</option>
            <option value="DECLINING">Declining</option>
          </select>
        </div>
      </div>

      <div className="pt-4 border-t border-border flex justify-end gap-3">
        <button 
          type="button"
          onClick={(e) => handleSubmit(e, true)}
          disabled={isPending || !content.trim()}
          className="px-4 py-2 h-[44px] rounded-[12px] text-sm font-medium text-[#CBD5E1] border border-border hover:bg-[#172554] hover:text-white hover:border-primary/50 transition-colors disabled:opacity-50"
        >
          Save as Draft
        </button>
        <button 
          type="submit"
          disabled={isPending || !content.trim()}
          className="flex items-center gap-2 px-5 py-2 h-[44px] rounded-[12px] bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all shadow-[0_4px_14px_rgba(37,99,235,0.35)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : (
            <><CheckCircle className="w-4 h-4" /> Finalize Note</>
          )}
        </button>
      </div>
    </form>
  );
}
