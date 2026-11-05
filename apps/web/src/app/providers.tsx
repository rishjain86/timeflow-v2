"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // 🟢 Tab focus hone par background me saari APIs wapas call nahi hongi
        refetchOnWindowFocus: false, 
        
        // 🟢 LOOP KILLER: Agar token expire (401/403) hai toh turant rok do, retry mat karo
        retry: (failureCount, error: any) => {
          if (error?.response?.status === 401 || error?.response?.status === 403) {
            return false; // Zero retry, instantly fail hone do taaki axios logout kar sake
          }
          return failureCount < 2; // Baaki normal network issues ke liye 2 baar retry
        },
      },
    },
  }));

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {/* 🟢 THEME PROVIDER ADDED */}
        <ThemeProvider 
          attribute="class" 
          defaultTheme="dark" 
          enableSystem 
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
