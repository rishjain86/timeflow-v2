import { useQuery } from '@tanstack/react-query';
// import { axiosInstance } from '@/lib/axios'; // Uncomment when backend is ready

export type DocumentStatus = 'COMPLETED' | 'ACTION_NEEDED' | 'AVAILABLE';

export interface PatientDocument {
  id: string;
  name: string;
  category: string;
  date: string;
  status: DocumentStatus;
}

export interface PatientDocumentsData {
  documents: PatientDocument[];
}

// Mock Data separated from the UI component
const mockDocumentsData: PatientDocumentsData = {
  documents: [
    { 
      id: 'doc_1', 
      name: 'Telehealth Consent Form', 
      category: 'Consent', 
      date: 'Jul 10, 2026', 
      status: 'COMPLETED' 
    },
    { 
      id: 'doc_2', 
      name: 'Intake Questionnaire', 
      category: 'Form', 
      date: 'Jul 10, 2026', 
      status: 'COMPLETED' 
    },
    { 
      id: 'doc_3', 
      name: 'Anxiety Assessment (GAD-7)', 
      category: 'Assessment', 
      date: 'Aug 01, 2026', 
      status: 'ACTION_NEEDED' 
    },
    { 
      id: 'doc_4', 
      name: 'Grounding Techniques Guide', 
      category: 'Resource', 
      date: 'Jul 24, 2026', 
      status: 'AVAILABLE' 
    }
  ]
};

export const useGetPatientDocuments = () => {
  return useQuery({
    queryKey: ['patient-documents'],
    queryFn: async (): Promise<PatientDocumentsData> => {
      // Simulate network delay for realistic loading states in UI
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      // Future implementation:
      // const { data } = await axiosInstance.get('/api/patient/documents');
      // return data;

      return mockDocumentsData;
    },
  });
};
