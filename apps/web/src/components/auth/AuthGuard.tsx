'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '@/features/auth/api/get-auth-user';

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { data: user, isLoading, isError } = useAuthUser();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Check if token exists in localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (isMounted && (!token || isError || (!isLoading && !user))) {
      router.push('/login');
    }
  }, [user, isLoading, isError, isMounted, router]);

  // Prevent hydration errors by not rendering until mounted
  if (!isMounted || isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-gray-500 font-medium">Loading...</p>
      </div>
    );
  }

  // If user is authenticated, render protected content
  if (user) {
    return <>{children}</>;
  }

  // Return null while redirecting
  return null;
};
