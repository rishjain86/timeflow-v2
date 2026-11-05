import { useQuery } from '@tanstack/react-query';
// import { axiosInstance } from '@/lib/axios'; // Will be used when backend is ready

export interface UpcomingAppointment {
  id: string;
  type: string;
  providerName: string;
  modality: 'Telehealth' | 'In-Person';
  date: string; // ISO string or formatted string
  time: string;
}

export interface RecentInvoice {
  id: string;
  description: string;
  dueDate: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
}

export interface PatientDashboardData {
  patientName: string;
  upcomingAppointment: UpcomingAppointment | null;
  recentInvoices: RecentInvoice[];
}

// Mock Data to simulate backend response during UI development
const mockDashboardData: PatientDashboardData = {
  patientName: 'Sarah',
  upcomingAppointment: {
    id: 'apt_123',
    type: 'Cognitive Behavioral Therapy',
    providerName: 'Dr. Emily Chen',
    modality: 'Telehealth',
    date: 'Thursday, Aug 15, 2026',
    time: '10:00 AM - 10:45 AM',
  },
  recentInvoices: [
    {
      id: 'inv_456',
      description: 'Session Fee - Aug 1',
      dueDate: 'Due in 5 days',
      amount: 120.00,
      status: 'PENDING',
    }
  ]
};

export const useGetPatientDashboard = () => {
  return useQuery({
    queryKey: ['patient-dashboard'],
    queryFn: async (): Promise<PatientDashboardData> => {
      // Simulate network delay for realistic loading states
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      // Future implementation:
      // const { data } = await axiosInstance.get('/api/patient/dashboard');
      // return data;

      return mockDashboardData;
    },
  });
};
