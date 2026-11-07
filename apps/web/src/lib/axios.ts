import axios from 'axios';
import { getSession, signOut } from 'next-auth/react';

export const axiosInstance = axios.create({
  // URL seedha environment variable se uthao
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1', 
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor
axiosInstance.interceptors.request.use(
  async (config) => {
    // Pehle localStorage check karo (sabse fast)
    let token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    // Agar nahi mila toh NextAuth session se nikalo
    if (!token) {
      const session = await getSession();
      token = (session as any)?.user?.token || (session as any)?.token || (session as any)?.id;
      
      // Token mil gaya toh usko aage ke liye save kar lo taaki baar baar getSession call na ho
      if (token && typeof window !== 'undefined') {
        localStorage.setItem('token', token);
      }
    }
    
    // Sabse zaroori: Ensure karo ki 'Bearer undefined' server par na jaye
    if (token && token !== 'undefined' && token !== 'null' && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Temporary password: send the user to the change-password screen instead of showing broken pages.
    if (error.response?.status === 403 && error.response?.data?.code === 'PASSWORD_CHANGE_REQUIRED') {
      if (typeof window !== 'undefined' && window.location.pathname !== '/change-password') {
        window.location.href = '/change-password';
      }
      return Promise.reject(error);
    }

    // Patient accounts are confined to the patient API: send them to their own portal.
    if (error.response?.status === 403 && error.response?.data?.code === 'PATIENT_SCOPE') {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/patient')) {
        window.location.href = '/patient';
      }
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        
        // Loop break karne ka RAMBAAN ilaaj: 
        // Agar pehle se login page par nahi hai, tabhi bahar nikalo
        if (window.location.pathname !== '/login') {
          // Ye NextAuth ki cookie bhi uda dega aur proper login page par bhejega
          await signOut({ callbackUrl: '/login' });
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
