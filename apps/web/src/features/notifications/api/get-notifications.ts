import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

// Types for Notifications (Updated to match Prisma Enum SPRINT 6)
export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string; // ISO String
  link?: string; // Optional URL to redirect when clicked
}

// 1. Fetch Notifications
export const useGetNotifications = () => {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async (): Promise<AppNotification[]> => {
      const { data } = await axiosInstance.get('/api/notifications');
      return data?.data || data;
    },
    // Refetch every 2 minutes to keep notifications fresh
    refetchInterval: 1000 * 60 * 2, 
  });
};

// 2. Mark as Read Mutation
export const useMarkNotificationAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.patch(`/api/notifications/${id}/read`);
      return data;
    },
    onSuccess: () => {
      // Refresh the notifications list to update the unread count
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

// 3. Mark All as Read Mutation (Bonus utility for Enterprise apps)
export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await axiosInstance.patch('/api/notifications/read-all');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
