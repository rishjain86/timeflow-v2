import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  companyName?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export const useClients = () => {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async (): Promise<Client[]> => {
      // Explicity injecting a massive limit to ensure no data is hidden by pagination defaults
      const response = await axiosInstance.get('/clients?limit=25000');
      
      // DEBUG LOG 1: Dekhte hain API se exact kya mila
      console.log("DEBUG - RAW RESPONSE:", response);

      // Bulletproof extraction: Ye line tumhare data ko har case me dhoond legi 
      const rawData = response?.data || response;
      const clientsList = rawData?.data?.clients || rawData?.clients || rawData?.data || rawData || [];
      
      // DEBUG LOG 2: Array nikla ya nahi
      console.log("DEBUG - EXTRACTED CLIENTS:", clientsList);
      
      // Ensure karte hain ki hamesha array hi return ho, warna UI fat jayega
      return Array.isArray(clientsList) ? clientsList : [];
    },
  });
};
