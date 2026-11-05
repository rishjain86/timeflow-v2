'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRegister } from '../api/register';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Building2, 
  Briefcase, 
  ChevronDown, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle 
} from 'lucide-react';

const registerSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Valid phone number is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  organizationName: z.string().min(2, 'Company or Workspace name is required'),
  industryType: z.enum(['GENERAL', 'HEALTHCARE']).default('GENERAL'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export const RegisterForm = () => {
  const router = useRouter();
  const registerMutation = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      industryType: 'GENERAL',
    },
  });

  const onSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data, {
      onSuccess: async () => {
        // 🟢 Removed annoying window.alert popup as requested

        const result = await signIn('credentials', {
          redirect: false,
          email: data.email,
          password: data.password,
        });

        if (!result?.error) {
          router.push('/dashboard');
          router.refresh();
        } else {
          router.push('/login');
        }
      },
    });
  };

  const carvedInputClass =
    'block w-full h-11 rounded-[14px] border border-white/5 bg-background pl-11 pr-3.5 text-sm font-medium text-foreground placeholder-muted-foreground/60 shadow-[inset_4px_4px_9px_rgba(4,8,18,0.8),inset_-2px_-2px_6px_rgba(35,51,98,0.28)] focus:border-primary/60 focus:outline-none focus:shadow-[inset_4px_4px_9px_rgba(4,8,18,0.85),0_0_15px_rgba(57,255,136,0.22)] transition-all duration-200';

  const embossedIconPill =
    'pointer-events-none absolute left-2 flex h-7 w-7 items-center justify-center rounded-[9px] bg-card border border-white/5 shadow-[2px_2px_5px_rgba(4,8,18,0.7),-1px_-1px_3px_rgba(35,51,98,0.25)]';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {registerMutation.isError && (
        <div className="flex items-center gap-2.5 rounded-[14px] bg-destructive/10 p-3.5 text-xs sm:text-sm text-destructive font-semibold border border-destructive/30 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.45)]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Registration failed. Please check your details and try again.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
            First Name
          </label>
          <div className="relative flex items-center">
            <div className={embossedIconPill}>
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <input
              type="text"
              placeholder="John"
              {...register('firstName')}
              className={carvedInputClass}
            />
          </div>
          {errors.firstName && (
            <span className="block text-destructive text-xs font-semibold ml-1">
              {errors.firstName.message}
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
            Last Name
          </label>
          <div className="relative flex items-center">
            <div className={embossedIconPill}>
              <User className="h-3.5 w-3.5 text-primary/70" />
            </div>
            <input
              type="text"
              placeholder="Doe"
              {...register('lastName')}
              className={carvedInputClass}
            />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
          Email Address
        </label>
        <div className="relative flex items-center">
          <div className={embossedIconPill}>
            <Mail className="h-3.5 w-3.5 text-primary" />
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

      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
          Phone Number
        </label>
        <div className="relative flex items-center">
          <div className={embossedIconPill}>
            <Phone className="h-3.5 w-3.5 text-primary" />
          </div>
          <input
            type="tel"
            placeholder="e.g. 9876543210"
            {...register('phone')}
            className={carvedInputClass}
          />
        </div>
        {errors.phone && (
          <span className="block text-destructive text-xs font-semibold ml-1">
            {errors.phone.message}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
          Password
        </label>
        <div className="relative flex items-center">
          <div className={embossedIconPill}>
            <Lock className="h-3.5 w-3.5 text-primary" />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a strong password (min 8 chars)"
            {...register('password')}
            className={`${carvedInputClass} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2.5 flex h-7 w-7 items-center justify-center rounded-[8px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
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

      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
          Company / Workspace Name
        </label>
        <div className="relative flex items-center">
          <div className={embossedIconPill}>
            <Building2 className="h-3.5 w-3.5 text-primary" />
          </div>
          <input
            type="text"
            placeholder="e.g. TechFlow IT Solutions"
            {...register('organizationName')}
            className={carvedInputClass}
          />
        </div>
        {errors.organizationName && (
          <span className="block text-destructive text-xs font-semibold ml-1">
            {errors.organizationName.message}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">
          Industry Type
        </label>
        <div className="relative flex items-center">
          <div className={embossedIconPill}>
            <Briefcase className="h-3.5 w-3.5 text-primary" />
          </div>
          <select
            {...register('industryType')}
            className={`${carvedInputClass} pr-9 appearance-none cursor-pointer`}
          >
            <option value="GENERAL" className="bg-[#0B132B] text-white">General Business (IT, Agency, Consulting)</option>
            <option value="HEALTHCARE" className="bg-[#0B132B] text-white">Healthcare & Therapy Clinics</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="pt-3">
        <button
          type="submit"
          disabled={registerMutation.isPending}
          className="group relative flex h-13 w-full items-center justify-center gap-2 rounded-[16px] bg-gradient-to-b from-[#52FF9A] to-[#2CE576] px-6 text-sm font-extrabold uppercase tracking-wider text-[#0B132B] shadow-[0_5px_0_#199E49,0_12px_28px_rgba(57,255,136,0.38),inset_0_2px_1px_rgba(255,255,255,0.65)] hover:brightness-105 active:translate-y-[3px] active:shadow-[0_2px_0_#199E49,0_5px_12px_rgba(57,255,136,0.25),inset_0_2px_4px_rgba(0,0,0,0.2)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {registerMutation.isPending ? (
            <span>Creating Workspace...</span>
          ) : (
            <>
              <span>Create Account & Workspace</span>
              <ArrowRight className="h-4 w-4 !text-[#0B132B] transition-transform duration-200 group-hover:translate-x-1" />
            </>
          )}
        </button>
      </div>
    </form>
  );
};
