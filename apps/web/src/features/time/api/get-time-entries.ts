import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

interface GetTimeEntriesParams {
  page?: number;
  limit?: number | string;
  projectId?: string;
  clientId?: string;
  userId?: string;
  taskId?: string;
  startDate?: string;
  endDate?: string;
  isBillable?: boolean;
}

export const getTimeEntries = async (params?: GetTimeEntriesParams) => {
  const { data } = await axiosInstance.get('/time-entries', { params });
  return data;
};

export const useTimeEntries = (params?: GetTimeEntriesParams) => {
  return useQuery({
    queryKey: ['time-entries', params],
    queryFn: () => getTimeEntries(params),
  });
};
