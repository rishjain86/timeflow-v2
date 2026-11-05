import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

// Types for Role-Based Access Control (RBAC)
export type RoleType = 'ADMIN' | 'THERAPIST' | 'BILLING' | 'FRONT_DESK';

export interface UserPermission {
  id: string;
  module: string; // e.g., 'APPOINTMENTS', 'BILLING', 'AUTHORIZATIONS', 'SETTINGS'
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

export interface UserRoleData {
  id: string;
  name: string;
  email: string;
  role: RoleType;
  isActive: boolean;
  lastLogin: string; // ISO String
  permissions: UserPermission[];
}

export const useGetUsersRoles = () => {
  return useQuery({
    queryKey: ['users-roles'],
    queryFn: async (): Promise<UserRoleData[]> => {
      const { data } = await axiosInstance.get('/api/settings/users');
      // Ensure we handle both direct array or wrapped inside 'data' key
      return data?.data || data;
    },
  });
};
