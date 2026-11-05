'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Lock, 
  Camera, 
  Loader2, 
  Save,
  Building,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthUser } from '@/features/auth/api/get-auth-user';
import { axiosInstance } from '@/lib/axios';

export default function ProfilePage() {
  const { data: user, isLoading, refetch } = useAuthUser();

  // File Upload State
  const [isUploading, setIsUploading] = useState(false);

  // Profile Form State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });

  // Password Form State
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Pre-fill profile data when user loads
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Image Upload Handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading('Uploading profile picture...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      await axiosInstance.post('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      toast.success('Profile picture updated!', { id: toastId });
      refetch(); 
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload image.', { id: toastId });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Safe Form Submit for Profile
  const handleProfileUpdate = async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    
    if (!profileData.firstName.trim()) {
      toast.error('First Name is required');
      return;
    }

    setIsSavingProfile(true);
    setProfileSuccessMsg(false);
    const toastId = toast.loading('Updating profile...');
    
    try {
      const payload = {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
      };

      await axiosInstance.patch(`/users/${user?.id}`, payload);
      
      toast.success('Profile updated successfully!', { id: toastId });
      setIsEditingProfile(false);
      setProfileSuccessMsg(true);
      
      setTimeout(() => setProfileSuccessMsg(false), 5000);
      
      refetch(); 
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile', { id: toastId });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Safe Form Submit for Password
  const handlePasswordUpdate = async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    setIsSavingPassword(true);
    setPasswordSuccessMsg(false); 
    const toastId = toast.loading('Updating password...');

    try {
      await axiosInstance.patch(`/users/update-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      
      toast.success('Password updated successfully!', { id: toastId });
      
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordSuccessMsg(true);
      
      setTimeout(() => setPasswordSuccessMsg(false), 5000);
      
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password', { id: toastId });
    } finally {
      setIsSavingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Loading profile data...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] bg-background text-center p-6">
        <User className="w-12 h-12 text-muted-foreground mb-3 opacity-50" />
        <h1 className="text-xl font-bold text-foreground">Profile Not Found</h1>
        <p className="text-sm text-muted-foreground mt-1">Unable to load your profile details at this time.</p>
      </div>
    );
  }

  const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase() || 'U';

  return (
    <div className="timeflow-container space-y-6 animate-in fade-in duration-500 py-6 max-w-6xl mx-auto">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <User className="w-8 h-8 text-primary" />
            Profile Settings
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage your personal information and account security.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Left Column - ID Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="enterprise-card p-6 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-accent to-primary/20"></div>
            
            <label className="relative mt-8 mb-4 group cursor-pointer block touch-manipulation">
              <div className="h-24 w-24 rounded-full border-4 border-card bg-accent flex items-center justify-center text-3xl font-bold text-info shadow-xl overflow-hidden relative">
                
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}

                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </div>
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload} 
              />
            </label>

            <h2 className="text-xl font-bold text-foreground">{user.firstName} {user.lastName}</h2>
            <div className="flex items-center justify-center gap-1.5 mt-1.5 mb-4">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary uppercase tracking-wider">
                {user.role === 'USER' ? 'Employee' : user.role}
              </span>
            </div>

            <div className="w-full space-y-3 mt-4 text-left">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Email Address</p>
                  <p className="text-sm text-foreground font-medium truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border">
                <Building className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Default Org</p>
                  <p className="text-sm text-foreground font-medium truncate">{user.organization?.name || 'Not Assigned'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Forms */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Personal Information Form */}
          <div className="enterprise-card p-0 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border bg-card">
              <h3 className="text-lg font-bold text-foreground">Personal Information</h3>
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setIsEditingProfile(!isEditingProfile);
                }}
                className="text-sm font-semibold text-info hover:text-foreground transition-colors"
              >
                {isEditingProfile ? 'Cancel' : 'Edit Details'}
              </button>
            </div>
            
            <form onSubmit={handleProfileUpdate} className="p-6 space-y-5">
              
              {profileSuccessMsg && (
                <div className="p-4 rounded-[10px] bg-success/10 border border-success/30 flex items-start gap-3 animate-in slide-in-from-top-2">
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-success">Profile Updated</h4>
                    <p className="text-xs text-success/80 mt-0.5">Your personal details have been saved successfully.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">First Name</label>
                  <input 
                    type="text" 
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                    disabled={!isEditingProfile || isSavingProfile}
                    className="input-field h-[44px] bg-background text-foreground border-border disabled:opacity-50 disabled:cursor-not-allowed" 
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                  <input 
                    type="text" 
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                    disabled={!isEditingProfile || isSavingProfile}
                    className="input-field h-[44px] bg-background text-foreground border-border disabled:opacity-50 disabled:cursor-not-allowed" 
                    placeholder="Enter last name"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input 
                      type="tel" 
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      disabled={!isEditingProfile || isSavingProfile}
                      className="input-field pl-9 h-[44px] bg-background text-foreground border-border disabled:opacity-50 disabled:cursor-not-allowed" 
                      placeholder="e.g. +1 (555) 000-0000"
                    />
                  </div>
                </div>
              </div>

              {isEditingProfile && (
                <div className="pt-2 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={isSavingProfile}
                    className="btn-primary min-w-[140px] h-[44px] flex items-center justify-center shadow-md disabled:opacity-50"
                  >
                    {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Change Password Form */}
          <div className="enterprise-card p-0 overflow-hidden border-destructive/20">
            <div className="flex items-center gap-2 p-5 border-b border-border bg-card">
              <Lock className="w-5 h-5 text-foreground" />
              <h3 className="text-lg font-bold text-foreground">Security & Password</h3>
            </div>
            
            <form onSubmit={handlePasswordUpdate} className="p-6 space-y-5">
              
              {passwordSuccessMsg && (
                <div className="p-4 rounded-[10px] bg-success/10 border border-success/30 flex items-start gap-3 animate-in slide-in-from-top-2">
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-success">Password Changed Successfully!</h4>
                    <p className="text-xs text-success/80 mt-0.5">You can now use your new password for your next login.</p>
                  </div>
                </div>
              )}

              <div className="space-y-1.5 max-w-md">
                <label className="text-sm font-medium text-muted-foreground">Current Password</label>
                <input 
                  type="password" 
                  required
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  disabled={isSavingPassword}
                  className="input-field h-[44px] bg-background text-foreground border-border disabled:opacity-50" 
                  placeholder="Enter current password"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">New Password</label>
                  <input 
                    type="password" 
                    required
                    minLength={8}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    disabled={isSavingPassword}
                    className="input-field h-[44px] bg-background text-foreground border-border disabled:opacity-50" 
                    placeholder="New password (min 8 chars)"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Confirm New Password</label>
                  <input 
                    type="password" 
                    required
                    minLength={8}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    disabled={isSavingPassword}
                    className="input-field h-[44px] bg-background text-foreground border-border disabled:opacity-50" 
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isSavingPassword || !passwordData.currentPassword || !passwordData.newPassword}
                  className="btn-primary bg-card border border-border text-foreground hover:bg-accent min-w-[160px] h-[44px] flex items-center justify-center disabled:opacity-50 shadow-md"
                >
                  {isSavingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
