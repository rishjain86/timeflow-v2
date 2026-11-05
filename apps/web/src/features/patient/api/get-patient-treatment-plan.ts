import { useQuery } from '@tanstack/react-query';
// import { axiosInstance } from '@/lib/axios'; // Uncomment when backend is ready

export type GoalStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';

export interface TreatmentGoal {
  id: string;
  title: string;
  status: GoalStatus;
  progress: number;
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  isDone: boolean;
}

export interface PatientTreatmentPlanData {
  diagnosis: string;
  startDate: string;
  overallProgress: number;
  currentPhase: string;
  goals: TreatmentGoal[];
  milestones: Milestone[];
}

// Mock Data separated from the UI component
const mockTreatmentPlanData: PatientTreatmentPlanData = {
  diagnosis: "Generalized Anxiety Disorder (GAD)",
  startDate: "July 10, 2026",
  overallProgress: 45,
  currentPhase: "Phase 2: Cognitive Restructuring",
  goals: [
    {
      id: 'g1',
      title: 'Reduce daily panic attacks',
      status: 'IN_PROGRESS',
      progress: 60,
    },
    {
      id: 'g2',
      title: 'Establish a healthy sleep routine',
      status: 'COMPLETED',
      progress: 100,
    },
    {
      id: 'g3',
      title: 'Identify core anxiety triggers',
      status: 'IN_PROGRESS',
      progress: 30,
    }
  ],
  milestones: [
    { id: 'm1', title: 'Initial Assessment Completed', date: 'Jul 10, 2026', isDone: true },
    { id: 'm2', title: 'Learn basic grounding techniques', date: 'Jul 24, 2026', isDone: true },
    { id: 'm3', title: 'Challenge negative thought patterns', date: 'Aug 15, 2026', isDone: false },
    { id: 'm4', title: 'Exposure therapy introduction', date: 'Sep 05, 2026', isDone: false },
  ]
};

export const useGetPatientTreatmentPlan = () => {
  return useQuery({
    queryKey: ['patient-treatment-plan'],
    queryFn: async (): Promise<PatientTreatmentPlanData> => {
      // Simulate network delay for realistic loading states in UI
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      // Future implementation:
      // const { data } = await axiosInstance.get('/api/patient/treatment-plan');
      // return data;

      return mockTreatmentPlanData;
    },
  });
};
