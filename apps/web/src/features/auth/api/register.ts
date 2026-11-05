import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';
import { AuthResponse } from './login';

export interface RegisterPayload {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  organizationName: string;
}

export const register = async (data: RegisterPayload): Promise<AuthResponse> => {
  // Fix: Removed /v1 because it's already in NEXT_PUBLIC_API_URL
  const response = await axiosInstance.post('/auth/register', data); 
  return response.data?.data || response.data;
};

export const useRegister = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      queryClient.setQueryData(['auth-user'], data.user);
    },
  });
};
