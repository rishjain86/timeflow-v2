'use client';

import { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginFormInner = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);

    const callbackUrl = searchParams.get('from') || '/';

    const result = await signIn('credentials', {
      redirect: false,
      email: data.email,
      password: data.password,
    });

    setIsLoading(false);

    if (result?.error) {
      setError('Login failed. Please check your email and password.');
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  // Shared 3D Carved Input Class
  const carvedInputClass =
    'block w-full h-12 rounded-[14px] border border-white/5 bg-background pl-12 pr-4 text-sm font-medium text-foreground placeholder-muted-foreground/60 shadow-[inset_4px_4px_9px_rgba(4,8,18,0.8),inset_-2px_-2px_6px_rgba(35,51,98,0.28)] focus:border-primary/60 focus:outline-none focus:shadow-[inset_4px_4px_9px_rgba(4,8,18,0.85),0_0_16px_rgba(57,255,136,0.25)] transition-all duration-200';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {error && (
        <div className="flex items-center gap-2.5 rounded-[14px] bg-destructive/10 p-3.5 text-xs sm:text-sm text-destructive font-semibold border border-destructive/30 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.45)]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* EMAIL CARVED INPUT */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">
          Email Address
        </label>
        <div className="relative flex items-center">
          {/* 3D Embossed Left Icon Pill */}
          <div className="pointer-events-none absolute left-2 flex h-8 w-8 items-center justify-center rounded-[10px] bg-card border border-white/5 shadow-[2px_2px_5px_rgba(4,8,18,0.7),-1px_-1px_3px_rgba(35,51,98,0.25)]">
            <Mail className="h-4 w-4 text-primary" />
          </div>
          <input
            type="email"
            placeholder="name@example.com"
            {...register('email')}
            className={carvedInputClass}
          />
        </div>
        {errors.email && (
          <span className="block text-destructive text-xs font-semibold ml-1">
            {errors.email.message}
          </span>
        )}
      </div>

      {/* PASSWORD CARVED INPUT */}
      <div className="space-y-2">
        <div className="flex items-center justify-between ml-1">
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground" htmlFor="password">
            Password
          </label>
          
          {/* 🟢 BULLETPROOF FIX INTACT: Native button & router.push */}
          <button 
            type="button"
            onClick={() => router.push('/forgot-password')}
            className="text-xs font-bold text-primary hover:underline transition-all cursor-pointer bg-transparent border-none p-1 -mr-1"
          >
            Forgot password?
          </button>
        </div>
        
        <div className="relative flex items-center">
          {/* 3D Embossed Left Icon Pill */}
          <div className="pointer-events-none absolute left-2 flex h-8 w-8 items-center justify-center rounded-[10px] bg-card border border-white/5 shadow-[2px_2px_5px_rgba(4,8,18,0.7),-1px_-1px_3px_rgba(35,51,98,0.25)]">
            <Lock className="h-4 w-4 text-primary" />
          </div>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            {...register('password')}
            className={`${carvedInputClass} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2.5 flex h-8 w-8 items-center justify-center rounded-[10px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <span className="block text-destructive text-xs font-semibold ml-1">
            {errors.password.message}
          </span>
        )}
      </div>

      {/* 3D TACTILE EMBOSSED SUBMIT BUTTON */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="group relative flex h-13 w-full items-center justify-center gap-2 rounded-[16px] bg-gradient-to-b from-[#52FF9A] to-[#2CE576] px-6 text-sm font-extrabold uppercase tracking-wider text-[#0B132B] shadow-[0_5px_0_#199E49,0_12px_28px_rgba(57,255,136,0.38),inset_0_2px_1px_rgba(255,255,255,0.65)] hover:brightness-105 active:translate-y-[3px] active:shadow-[0_2px_0_#199E49,0_5px_12px_rgba(57,255,136,0.25),inset_0_2px_4px_rgba(0,0,0,0.2)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 !text-[#0B132B]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Log In to Workspace</span>
              <ArrowRight className="h-4 w-4 !text-[#0B132B] transition-transform duration-200 group-hover:translate-x-1" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export const LoginForm = () => {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-6">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <LoginFormInner />
    </Suspense>
  );
};
