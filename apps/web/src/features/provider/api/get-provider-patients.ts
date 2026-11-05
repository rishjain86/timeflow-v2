import { useQuery } from '@tanstack/react-query';
// import { axiosInstance } from '@/lib/axios'; // Uncomment when backend is ready

export type PatientStatus = 'ACTIVE' | 'ONBOARDING' | 'INACTIVE';

export interface ProviderPatient {
  id: string;
  name: string;
  diagnosis: string;
  lastSession: string;
  nextSession: string;
  status: PatientStatus;
}

export interface ProviderPatientsData {
  patients: ProviderPatient[];
}

// Mock Data separated from the UI component
const mockPatientsData: ProviderPatientsData = {
  patients: [
    {
      id: 'pat_1',
      name: 'Sarah Jenkins',
      diagnosis: 'Generalized Anxiety',
      lastSession: 'Jul 21, 2026',
      nextSession: 'Today, 10:00 AM',
      status: 'ACTIVE'
    },
    {
      id: 'pat_2',
      name: 'Michael Torres',
      diagnosis: 'Major Depressive Disorder',
      lastSession: 'New Patient',
      nextSession: 'Today, 11:30 AM',
      status: 'ONBOARDING'
    },
    {
      id: 'pat_3',
      name: 'David Kim',
      diagnosis: 'PTSD',
      lastSession: 'Jul 15, 2026',
      nextSession: 'Jul 29, 2026',
      status: 'ACTIVE'
    },
    {
      id: 'pat_4',
      name: 'Emma Watson',
      diagnosis: 'Social Anxiety',
      lastSession: 'Jun 10, 2026',
      nextSession: 'Unscheduled',
      status: 'INACTIVE'
    }
  ]
};

export const useGetProviderPatients = () => {
  return useQuery({
    queryKey: ['provider-patients'],
    queryFn: async (): Promise<ProviderPatientsData> => {
      // Simulate network delay for realistic loading states in UI
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      // Future implementation:
      // const { data } = await axiosInstance.get('/api/provider/patients');
      // return data;

      return mockPatientsData;
    },
  });
};
