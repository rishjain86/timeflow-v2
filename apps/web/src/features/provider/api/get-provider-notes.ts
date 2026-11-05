import { useQuery } from '@tanstack/react-query';
// import { axiosInstance } from '@/lib/axios'; // Uncomment when backend is ready

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

// Mock Data separated from the UI component
const mockNotesData: ProviderNotesData = {
  pendingNotes: [
    {
      id: 'note_pending_1',
      patientName: 'Sarah Jenkins',
      sessionDate: 'Today, 10:00 AM',
      sessionType: 'CBT Session',
      status: 'DRAFT',
      dueDate: 'Today, End of Day'
    },
    {
      id: 'note_pending_2',
      patientName: 'Michael Torres',
      sessionDate: 'Yesterday, 11:30 AM',
      sessionType: 'Initial Intake',
      status: 'MISSING',
      dueDate: 'Overdue by 1 Day'
    }
  ],
  completedNotes: [
    {
      id: 'note_comp_1',
      patientName: 'David Kim',
      sessionDate: 'Jul 26, 2026',
      sessionType: 'Follow-up',
      status: 'SIGNED',
      signedOn: 'Jul 26, 2026, 04:15 PM'
    },
    {
      id: 'note_comp_2',
      patientName: 'Emma Watson',
      sessionDate: 'Jul 24, 2026',
      sessionType: 'CBT Session',
      status: 'SIGNED',
      signedOn: 'Jul 25, 2026, 09:00 AM'
    }
  ]
};

export const useGetProviderNotes = () => {
  return useQuery({
    queryKey: ['provider-notes'],
    queryFn: async (): Promise<ProviderNotesData> => {
      // Simulate network delay for realistic loading states in UI
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      // Future implementation:
      // const { data } = await axiosInstance.get('/api/provider/notes');
      // return data;

      return mockNotesData;
    },
  });
};
