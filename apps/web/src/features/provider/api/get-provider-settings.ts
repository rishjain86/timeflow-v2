import { useQuery } from '@tanstack/react-query';
// import { axiosInstance } from '@/lib/axios'; // Uncomment when backend is ready

export interface ProviderProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  npi: string;
}

export interface ProviderAvailability {
  timezone: string;
  acceptingNewPatients: boolean;
}

export interface ProviderNotifications {
  newAppointments: boolean;
  cancellations: boolean;
  dailySummary: boolean;
}

export interface ProviderSettingsData {
  profile: ProviderProfile;
  availability: ProviderAvailability;
  notifications: ProviderNotifications;
}

// Mock Data separated from the UI component
const mockSettingsData: ProviderSettingsData = {
  profile: {
    firstName: 'Emily',
    lastName: 'Chen',
    email: 'emily.chen@example.com',
    phone: '+1 (555) 123-4567',
    title: 'Clinical Psychologist',
    npi: '1234567890',
  },
  availability: {
    timezone: 'America/New_York',
    acceptingNewPatients: true,
  },
  notifications: {
    newAppointments: true,
    cancellations: true,
    dailySummary: false,
  }
};

export const useGetProviderSettings = () => {
  return useQuery({
    queryKey: ['provider-settings'],
    queryFn: async (): Promise<ProviderSettingsData> => {
      // Simulate network delay for realistic loading states in UI
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      // Future implementation:
      // const { data } = await axiosInstance.get('/api/provider/settings');
      // return data;

      return mockSettingsData;
    },
  });
};
