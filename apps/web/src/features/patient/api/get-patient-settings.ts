import { useQuery } from '@tanstack/react-query';
// import { axiosInstance } from '@/lib/axios'; // Uncomment when backend is ready

export interface PatientProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface NotificationPreferences {
  appointmentReminders: boolean;
  billingAlerts: boolean;
  newDocuments: boolean;
}

export interface PatientSettingsData {
  profile: PatientProfile;
  notifications: NotificationPreferences;
}

// Mock Data separated from the UI component
const mockSettingsData: PatientSettingsData = {
  profile: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 000-0000',
  },
  notifications: {
    appointmentReminders: true,
    billingAlerts: true,
    newDocuments: true,
  }
};

export const useGetPatientSettings = () => {
  return useQuery({
    queryKey: ['patient-settings'],
    queryFn: async (): Promise<PatientSettingsData> => {
      // Simulate network delay for realistic loading states in UI
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      // Future implementation:
      // const { data } = await axiosInstance.get('/api/patient/settings');
      // return data;

      return mockSettingsData;
    },
  });
};
