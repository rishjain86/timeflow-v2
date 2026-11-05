'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  Check, 
  AlertTriangle, 
  Info 
} from 'lucide-react';

// Shadcn UI Components
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// API Hooks
import { 
  useGetNotifications, 
  useMarkNotificationAsRead, 
  useMarkAllNotificationsAsRead,
  AppNotification 
} from '@/features/notifications/api/get-notifications';

// SPRINT 6: Icon Helper based on Prisma NotificationType Enum (INFO, SUCCESS, WARNING, ERROR)
const getNotificationIcon = (type: AppNotification['type'] | string) => {
  switch (type) {
    case 'ERROR': return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case 'WARNING': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'SUCCESS': return <Check className="h-4 w-4 text-green-500" />;
    case 'INFO': 
    default: return <Info className="h-4 w-4 text-blue-500" />;
  }
};

export function NotificationDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);

  const { data: notifications = [], isLoading } = useGetNotifications();
  const { mutate: markAsRead } = useMarkNotificationAsRead();
  const { mutate: markAllAsRead, isPending: isMarkingAll } = useMarkAllNotificationsAsRead();

  // Derived State
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    setIsOpen(false);
    
    // Redirect if link exists
    if (notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-gray-600" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full p-0 text-[10px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent align="end" className="w-[380px] p-0 shadow-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-8 text-primary"
              onClick={() => markAllAsRead()}
              disabled={isMarkingAll}
            >
              <Check className="h-3 w-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading notifications...</div>
          ) : notifications.length > 0 ? (
            <div className="flex flex-col">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex items-start gap-4 p-4 text-left border-b transition-colors hover:bg-gray-50 outline-none focus:bg-gray-50 ${
                    !notification.isRead ? 'bg-primary/5' : 'bg-white'
                  }`}
                >
                  <div className="mt-1 bg-white p-2 rounded-full border shadow-sm shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 space-y-1 overflow-hidden">
                    <p className={`text-sm leading-tight ${!notification.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-2">
                      {/* ✅ Standardized to en-CA for Canadian localization */}
                      {new Date(notification.createdAt).toLocaleString('en-CA', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="h-2 w-2 bg-primary rounded-full shrink-0 mt-2" />
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center flex flex-col items-center justify-center">
              <Bell className="h-8 w-8 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-900">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">You have no new notifications.</p>
            </div>
          )}
        </ScrollArea>

        <div className="p-2 border-t">
          <Button variant="ghost" className="w-full text-xs" asChild>
            <Link href="/notifications" onClick={() => setIsOpen(false)}>
              View All Notifications
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
