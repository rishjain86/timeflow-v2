import { useQuery } from '@tanstack/react-query';
// import { axiosInstance } from '@/lib/axios'; // Uncomment when backend is ready

export type AppointmentModality = 'Telehealth' | 'In-Person';
export type AppointmentStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED';

export interface ProviderSession {
  id: string;
  patientName: string;
  time: string;
  type: string;
  modality: AppointmentModality;
  status: AppointmentStatus;
}

export interface DayGroup {
  date: string;
  sessions: ProviderSession[];
}

export interface ProviderAppointmentsData {
  upcomingAppointments: DayGroup[];
}

// Mock Data separated from the UI component
const mockAppointmentsData: ProviderAppointmentsData = {
  upcomingAppointments: [
    {
      date: 'Today, Jul 28, 2026',
      sessions: [
        {
          id: 'apt_1',
          patientName: 'Sarah Jenkins',
          time: '10:00 AM - 10:45 AM',
          type: 'CBT Session',
          modality: 'Telehealth',
          status: 'CONFIRMED'
        },
        {
          id: 'apt_2',
          patientName: 'Michael Torres',
          time: '11:30 AM - 12:15 PM',
          type: 'Initial Intake',
          modality: 'In-Person',
          status: 'CONFIRMED'
        },
        {
          id: 'apt_3',
          patientName: 'David Kim',
          time: '02:00 PM - 02:45 PM',
          type: 'Follow-up',
          modality: 'Telehealth',
          status: 'PENDING'
        }
      ]
    },
    {
      date: 'Tomorrow, Jul 29, 2026',
      sessions: [
        {
          id: 'apt_4',
          patientName: 'Emma Watson',
          time: '09:00 AM - 09:45 AM',
          type: 'CBT Session',
          modality: 'Telehealth',
          status: 'CONFIRMED'
        },
        {
          id: 'apt_5',
          patientName: 'James Wilson',
          time: '01:00 PM - 01:45 PM',
          type: 'Review Session',
          modality: 'Telehealth',
          status: 'CONFIRMED'
        }
      ]
    }
  ]
};

export const useGetProviderAppointments = () => {
  return useQuery({
    queryKey: ['provider-appointments'],
    queryFn: async (): Promise<ProviderAppointmentsData> => {
      // Simulate network delay for realistic loading states in UI
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      // Future implementation:
      // const { data } = await axiosInstance.get('/api/provider/appointments');
      // return data;

      return mockAppointmentsData;
    },
  });
};
