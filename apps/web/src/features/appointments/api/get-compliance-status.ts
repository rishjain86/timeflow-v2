import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export interface AppointmentComplianceStatus {
  appointmentId: string;
  attendanceStatus: string | null;
  clinicalNoteStatus: string | null;
  attendanceUploaded: boolean;
  clinicalNoteUploaded: boolean;
  attendanceComplete: boolean;
  clinicalNoteComplete: boolean;
  canSubmitTreatment: boolean;
  missingRequirements: string[];
}

export const getComplianceStatus = async (appointmentId: string): Promise<AppointmentComplianceStatus> => {
  const response = await axiosInstance.get(`/api/appointments/${appointmentId}/compliance`);
  return response.data?.data || response.data;
};

export const useComplianceStatus = (appointmentId: string) => {
  return useQuery({
    queryKey: ['appointment-compliance', appointmentId],
    queryFn: () => getComplianceStatus(appointmentId),
    enabled: !!appointmentId,
  });
};
