import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

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

export const useGetPatientAppointments = () => {
  return useQuery({
    queryKey: ['patient-appointments'],
    queryFn: async (): Promise<PatientAppointmentsData> => {
      const { data } = await axiosInstance.get('/patient/appointments');
      return data.data;
    },
    staleTime: 30_000,
  });
};
