'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { signOut } from 'next-auth/react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { axiosInstance } from '@/lib/axios';

// Must match the server-side policy: 10-128 chars with upper, lower, digit and symbol.
const POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,128}$/;

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-[#0B132B] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!POLICY.test(newPassword)) {
      toast.error('Use 10+ characters with an uppercase letter, a lowercase letter, a number and a symbol.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await axiosInstance.patch('/users/update-password', { currentPassword, newPassword });
      toast.success('Password updated. Welcome back!');
      window.location.assign('/');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    if (typeof window !== 'undefined') localStorage.removeItem('token');
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070D1F] px-4 py-12">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-5 rounded-[28px] border border-white/15 bg-[#111B36]/90 p-8 shadow-2xl"
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#0B132B]">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-extrabold text-white">Set a new password</h1>
          <p className="mt-1 text-sm text-white/60">
            Your account was created with a temporary password. Choose your own to continue.
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Temporary / current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
            required
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
            required
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
            required
          />
          <p className="text-xs text-white/50">
            At least 10 characters, with an uppercase letter, a lowercase letter, a number and a symbol.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving || !currentPassword || !newPassword || !confirmPassword}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <KeyRound className="h-4 w-4" />
          {saving ? 'Updating...' : 'Update password'}
        </button>

        <button type="button" onClick={handleSignOut} className="w-full text-center text-xs text-white/50 hover:text-white">
          Sign out
        </button>
      </form>
    </div>
  );
}
