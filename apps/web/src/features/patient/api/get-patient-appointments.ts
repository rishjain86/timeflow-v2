import { useQuery } from '@tanstack/react-query';
// import { axiosInstance } from '@/lib/axios'; // Uncomment when backend is ready

export type AppointmentStatus = 'CONFIRMED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type Modality = 'Telehealth' | 'In-Person';

export interface Appointment {
  id: string;
  type: string;
  provider: string;
  date: string;
  time: string;
  modality: Modality;
  status: AppointmentStatus;
}

export interface PatientAppointmentsData {
  upcoming: Appointment[];
  past: Appointment[];
}

// Mock Data separated into upcoming and past
const mockAppointmentsData: PatientAppointmentsData = {
  upcoming: [
    {
      id: 'apt_1',
      type: 'Cognitive Behavioral Therapy',
      provider: 'Dr. Emily Chen',
      date: 'Thursday, Aug 15, 2026',
      time: '10:00 AM - 10:45 AM',
      modality: 'Telehealth',
      status: 'CONFIRMED',
    },
    {
      id: 'apt_2',
      type: 'Follow-up Session',
      provider: 'Dr. Emily Chen',
      date: 'Thursday, Aug 29, 2026',
      time: '10:00 AM - 10:45 AM',
      modality: 'Telehealth',
      status: 'SCHEDULED',
    }
  ],
  past: [
    {
      id: 'apt_3',
      type: 'Initial Intake',
      provider: 'Dr. Emily Chen',
      date: 'Thursday, Aug 1, 2026',
      time: '10:00 AM - 11:00 AM',
      modality: 'In-Person',
      status: 'COMPLETED',
    }
  ]
};

export const useGetPatientAppointments = () => {
  return useQuery({
    queryKey: ['patient-appointments'],
    queryFn: async (): Promise<PatientAppointmentsData> => {
      // Simulate network delay for realistic loading states in UI
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      // Future implementation:
      // const { data } = await axiosInstance.get('/api/patient/appointments');
      // return data;

      return mockAppointmentsData;
    },
  });
};
