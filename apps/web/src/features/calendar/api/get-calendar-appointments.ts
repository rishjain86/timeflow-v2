import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

// Types for the Calendar Module
export type AppointmentStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface CalendarAppointment {
  id: string;
  clientId: string;
  clientName: string;
  therapistId: string;
  therapistName: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  status: AppointmentStatus;
  serviceType: string; // e.g., 'ABA Therapy', 'Speech Therapy'
  colorCode?: string; // Essential for visual categorization (e.g., #3b82f6 for Scheduled)
}

export interface GetCalendarParams {
  view: 'day' | 'week' | 'month';
  startDate: string; // ISO String mapping to the current view's start
  endDate: string;   // ISO String mapping to the current view's end
  therapistId?: string; // Optional: To filter by a specific therapist
}

export const useGetCalendarAppointments = (params: GetCalendarParams) => {
  return useQuery({
    queryKey: ['calendar-appointments', params],
    queryFn: async (): Promise<CalendarAppointment[]> => {
      // Passes startDate, endDate, and other filters as query params
      const { data } = await axiosInstance.get('/api/calendar/appointments', { params });
      return data?.data || data;
    },
    // Prevent aggressive refetching while user is navigating the calendar
    staleTime: 1000 * 60 * 5, 
  });
};
