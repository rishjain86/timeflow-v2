import axios from 'axios';
import { getSession, signOut } from 'next-auth/react';

export const axiosInstance = axios.create({
  // URL seedha environment variable se uthao
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://timeflow-erp-1.onrender.com/api/v1', 
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
