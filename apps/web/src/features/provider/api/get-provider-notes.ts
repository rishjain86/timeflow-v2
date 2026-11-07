import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export type NoteStatus = 'SIGNED' | 'DRAFT' | 'MISSING';

export interface ProviderNote {
  id: string;
  patientName: string;
  sessionDate: string;
  sessionType: string;
  status: NoteStatus;
}

export interface PendingNote extends ProviderNote {
  dueDate: string;
}

export interface CompletedNote extends ProviderNote {
  signedOn: string;
}

export interface ProviderNotesData {
  pendingNotes: PendingNote[];
  completedNotes: CompletedNote[];
}

export const useGetProviderNotes = () => {
  return useQuery({
    queryKey: ['provider-notes'],
    queryFn: async (): Promise<ProviderNotesData> => {
      const { data } = await axiosInstance.get('/provider/notes');
      return data.data;
    },
    staleTime: 30_000,
  });
};
