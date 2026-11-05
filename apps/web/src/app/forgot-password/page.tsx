'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { axiosInstance } from '@/lib/axios';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email address');

    setIsPending(true);
    try {
      // Backend API call to send reset link
      await axiosInstance.post('/auth/forgot-password', { email });
      setIsSent(true);
      toast.success('Reset link sent to your email!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send reset link');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07111F] p-4 font-sans relative overflow-hidden">
      {/* Background Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#0F172A] border border-slate-800 rounded-[24px] p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        <Link href="/login" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white transition-colors mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
        </Link>

        {isSent ? (
          <div className="text-center space-y-4 py-6">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Check your email</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              We've sent a password reset link to <span className="font-semibold text-white">{email}</span>. Please check your inbox and spam folder.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white tracking-tight">Reset Password</h1>
              <p className="text-slate-400 text-sm mt-2">
                Enter the email associated with your TimeFlow account and we'll send you instructions to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isPending}
                    placeholder="name@company.com"
                    className="w-full h-11 pl-10 pr-4 bg-[#1E293B] border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-[0_4px_14px_rgba(37,99,235,0.35)] transition-all flex items-center justify-center disabled:opacity-70"
              >
                {isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
