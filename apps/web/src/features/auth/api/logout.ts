import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '@/lib/axios';

export const logout = async () => {
  const response = await axiosInstance.post('/auth/logout');
  return response.data;
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      localStorage.removeItem('token');
      
      queryClient.clear();
      
      window.location.assign('/login');
    },
  });
};
