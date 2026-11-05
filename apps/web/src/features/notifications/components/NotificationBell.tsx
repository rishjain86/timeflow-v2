'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, Info, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useGetNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead, AppNotification, NotificationType } from '../api/get-notifications';
import Link from 'next/link';
import { useTheme } from 'next-themes'; // 🟢 NEW: Theme hook for solid background fix

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useGetNotifications();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  // 🟢 EXACT THEME FIX: Ensures solid background in Dark Mode & Light Mode without transparency
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const solidBg = isDark ? 'bg-[#0F172A]' : 'bg-white';

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'ERROR':
        return <AlertCircle className="w-4 h-4 text-destructive shrink-0" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-warning shrink-0" />;
      case 'SUCCESS':
        return <CheckCircle2 className="w-4 h-4 text-success shrink-0" />;
      case 'INFO':
      default:
        return <Info className="w-4 h-4 text-info shrink-0" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all ${solidBg}`}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        /* 🟢 FIXED: Positioned right under the bell icon using absolute positioning (left/right adjustment) with 100% solid background */
        <div className={`absolute right-0 sm:left-1/2 sm:-translate-x-1/2 mt-3 w-[320px] sm:w-96 border border-border rounded-[16px] shadow-2xl z-[99999] overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${solidBg}`}>
          <div className={`flex items-center justify-between px-4 py-3 border-b border-border ${isDark ? 'bg-[#1E293B]' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary border border-primary/30">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead.mutate()}
                className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto custom-scrollbar divide-y divide-border/50">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 transition-colors flex gap-3 items-start ${n.isRead ? 'opacity-75' : isDark ? 'bg-slate-800/40' : 'bg-slate-50/80'}`}
                >
                  <div className="mt-0.5">{getIcon(n.type)}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-foreground leading-snug">{n.title}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{n.message}</p>
                    
                    <div className="flex items-center justify-between pt-1">
                      {n.link ? (
                        <Link 
                          href={n.link} 
                          onClick={() => {
                            if (!n.isRead) markAsRead.mutate(n.id);
                            setIsOpen(false);
                          }}
                          className="text-[11px] font-semibold text-primary hover:underline"
                        >
                          View Details &rarr;
                        </Link>
                      ) : <span />}
                      {!n.isRead && (
                        <button
                          onClick={() => markAsRead.mutate(n.id)}
                          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={`p-2 border-t border-border ${isDark ? 'bg-[#1E293B]' : 'bg-slate-50'}`}>
            <Link 
              href="/notifications" 
              onClick={() => setIsOpen(false)}
              className="w-full block text-center py-2 text-xs font-semibold text-primary hover:underline"
            >
              View All Notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
