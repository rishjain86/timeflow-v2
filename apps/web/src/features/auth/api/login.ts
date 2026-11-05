import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string;
    role: string;
    organizationId: string;
  };
  token: string; 
}

export const login = async (data: LoginPayload): Promise<AuthResponse> => {
  const response = await axiosInstance.post('/auth/login', data);
  return response.data?.data || response.data;
};

export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      queryClient.setQueryData(['auth-user'], data.user);
    },
  });
};
