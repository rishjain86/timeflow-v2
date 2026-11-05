import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

// Types for Appointments and Metrics
export type AppointmentStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface DashboardAppointment {
  id: string;
  clientId: string;
  clientName: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  status: AppointmentStatus;
  serviceType: string; // e.g., 'ABA Therapy', 'Speech Therapy'
}

export interface TherapistMetrics {
  weeklyHoursLogged: number;
  targetWeeklyHours: number;
  completedSessionsThisWeek: number;
  productivityPercentage: number;
}

export interface TherapistDashboardData {
  therapistId: string;
  therapistName: string;
  metrics: TherapistMetrics;
  todayAppointments: DashboardAppointment[];
  upcomingAppointments: DashboardAppointment[];
}

export const useGetTherapistDashboard = () => {
  return useQuery({
    queryKey: ['therapist-dashboard'],
    queryFn: async (): Promise<TherapistDashboardData> => {
      // Endpoint assumes the backend identifies the therapist via the auth token
      const { data } = await axiosInstance.get('/api/therapists/dashboard');
      return data?.data || data;
    },
  });
};
