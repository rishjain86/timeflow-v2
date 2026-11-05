import { useQuery } from '@tanstack/react-query';
// import { axiosInstance } from '@/lib/axios'; // Uncomment when backend is ready

export type DocumentStatus = 'ACTIVE' | 'AVAILABLE' | 'EXPIRED';
export type DocumentCategory = 'License & Credential' | 'Patient Handout' | 'Training' | 'Insurance';

export interface ProviderDocument {
  id: string;
  name: string;
  category: DocumentCategory;
  uploadDate: string;
  status: DocumentStatus;
  expiry: string;
}

export interface ProviderDocumentsData {
  documents: ProviderDocument[];
}

// Mock Data separated from the UI component
const mockDocumentsData: ProviderDocumentsData = {
  documents: [
    {
      id: 'doc_1',
      name: 'State Medical License_2026.pdf',
      category: 'License & Credential',
      uploadDate: 'Jan 15, 2026',
      status: 'ACTIVE',
      expiry: 'Dec 31, 2026'
    },
    {
      id: 'doc_2',
      name: 'CBT Worksheet Template.docx',
      category: 'Patient Handout',
      uploadDate: 'Mar 10, 2026',
      status: 'AVAILABLE',
      expiry: 'N/A'
    },
    {
      id: 'doc_3',
      name: 'HIPAA Compliance Certificate.pdf',
      category: 'Training',
      uploadDate: 'Feb 05, 2026',
      status: 'ACTIVE',
      expiry: 'Feb 05, 2027'
    },
    {
      id: 'doc_4',
      name: 'Malpractice Insurance 2025.pdf',
      category: 'Insurance',
      uploadDate: 'Jan 01, 2025',
      status: 'EXPIRED',
      expiry: 'Dec 31, 2025'
    }
  ]
};

export const useGetProviderDocuments = () => {
  return useQuery({
    queryKey: ['provider-documents'],
    queryFn: async (): Promise<ProviderDocumentsData> => {
      // Simulate network delay for realistic loading states in UI
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      // Future implementation:
      // const { data } = await axiosInstance.get('/api/provider/documents');
      // return data;

      return mockDocumentsData;
    },
  });
};
