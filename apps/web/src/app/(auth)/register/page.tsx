import Link from 'next/link';
import { Layers, Sparkles, Activity, ShieldCheck } from 'lucide-react';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { ParticleVortexCanvas } from '@/components/ui/ParticleVortexCanvas';

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#070D1F] px-4 py-12 sm:px-6 lg:px-8 overflow-hidden select-none">
      {/* 🌌 FULL-SCREEN 3D PARTICLE VORTEX TREE & RIPPLE RINGS */}
      <ParticleVortexCanvas />

      {/* 🛸 ORBITING FLOATING PILLS */}
      <div className="pointer-events-none hidden xl:flex fixed left-[7%] top-[32%] z-10 items-center gap-3 rounded-full bg-[#111C38]/75 px-5 py-2.5 border border-white/10 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.6),inset_1px_1px_1px_rgba(255,255,255,0.15)] animate-float-slow">
        <Activity className="h-4 w-4 text-primary" />
        <span className="text-xs font-bold tracking-wider text-white/90">Real-Time Billing & Analytics</span>
      </div>

      <div className="pointer-events-none hidden xl:flex fixed right-[8%] top-[28%] z-10 items-center gap-3 rounded-full bg-[#111C38]/75 px-5 py-2.5 border border-white/10 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.6),inset_1px_1px_1px_rgba(255,255,255,0.15)] animate-float-slow">
        <ShieldCheck className="h-4 w-4 text-[#38BDF8]" />
        <span className="text-xs font-bold tracking-wider text-white/90">16-Point Security Shield Active</span>
      </div>

      {/* 🛡️ 3D EMBOSSED MAIN VAULT CARD */}
      <div className="relative z-20 w-full max-w-lg space-y-7 rounded-[28px] bg-[#111B36]/85 backdrop-blur-2xl p-7 sm:p-10 border border-white/15 shadow-[20px_20px_50px_rgba(3,6,15,0.9),-6px_-6px_24px_rgba(56,189,248,0.12),inset_1px_1px_2px_rgba(255,255,255,0.2),inset_-1px_-1px_2px_rgba(0,0,0,0.5)] transition-all duration-300">
        
        {/* Top Glowing Rim Line */}
        <div className="pointer-events-none absolute inset-x-12 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

        {/* 3D Embossed Header & Icon Socket */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#0B132B] border border-white/10 shadow-[6px_6px_14px_rgba(4,8,18,0.9),-4px_-4px_12px_rgba(35,51,98,0.35),inset_1px_1px_2px_rgba(57,255,136,0.35)]">
            <Layers className="h-8 w-8 text-primary drop-shadow-[0_0_10px_rgba(57,255,136,0.6)]" />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0B132B]/90 px-3.5 py-1 mb-2.5 border border-white/10 shadow-[inset_2px_2px_5px_rgba(4,8,18,0.8),inset_-1px_-1px_4px_rgba(35,51,98,0.25)]">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
              14-Day Free Trial Included
            </span>
          </div>

          <h2 className="text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
            Create an account
          </h2>
          <p className="mt-1.5 text-center text-xs sm:text-sm font-medium text-slate-300">
            Streamlined Healthcare & Enterprise Operations
          </p>
        </div>
        
        <RegisterForm />
        
        {/* 3D Recessed Footer Slot */}
        <div className="pt-2">
          <div className="rounded-[16px] bg-[#0B132B]/75 p-3.5 text-center border border-white/5 shadow-[inset_3px_3px_7px_rgba(4,8,18,0.85),inset_-2px_-2px_6px_rgba(35,51,98,0.2)]">
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-bold text-primary hover:underline ml-1 transition-all drop-shadow-[0_0_8px_rgba(57,255,136,0.35)]"
              >
                Log in here →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
