import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

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

export const useGetProviderAppointments = () => {
  return useQuery({
    queryKey: ['provider-appointments'],
    queryFn: async (): Promise<ProviderAppointmentsData> => {
      const { data } = await axiosInstance.get('/provider/appointments');
      return data.data;
    },
    staleTime: 30_000,
  });
};
