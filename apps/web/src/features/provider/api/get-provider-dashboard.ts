import { useQuery } from '@tanstack/react-query';
// import { axiosInstance } from '@/lib/axios'; // Uncomment when backend is ready

export type AppointmentModality = 'Telehealth' | 'In-Person';
export type AppointmentStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED';
export type AlertSeverity = 'high' | 'medium' | 'low';

export interface ProviderStats {
  totalPatients: number;
  sessionsToday: number;
  pendingNotes: number;
}

export interface TodayAppointment {
  id: string;
  patientName: string;
  time: string;
  type: string;
  modality: AppointmentModality;
  status: AppointmentStatus;
}

export interface PatientAlert {
  id: string;
  patientName: string;
  alert: string;
  severity: AlertSeverity;
  date: string;
}

export interface ProviderDashboardData {
  stats: ProviderStats;
  todaysAppointments: TodayAppointment[];
  patientAlerts: PatientAlert[];
}

// Mock Data separated from the UI component
const mockDashboardData: ProviderDashboardData = {
  stats: {
    totalPatients: 42,
    sessionsToday: 5,
    pendingNotes: 3,
  },
  todaysAppointments: [
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
  ],
  patientAlerts: [
    {
      id: 'al_1',
      patientName: 'Emma Watson',
      alert: 'High GAD-7 Score reported',
      severity: 'high',
      date: 'Today'
    },
    {
      id: 'al_2',
      patientName: 'James Wilson',
      alert: 'Intake form overdue by 2 days',
      severity: 'medium',
      date: 'Yesterday'
    }
  ]
};

export const useGetProviderDashboard = () => {
  return useQuery({
    queryKey: ['provider-dashboard'],
    queryFn: async (): Promise<ProviderDashboardData> => {
      // Simulate network delay for realistic loading states in UI
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      // Future implementation:
      // const { data } = await axiosInstance.get('/api/provider/dashboard');
      // return data;

      return mockDashboardData;
    },
  });
};
