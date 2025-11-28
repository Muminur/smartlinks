'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Check,
  CheckCheck,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { useNotificationStore, type NotificationType, type Notification } from '@/stores/notification-store';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/Button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const notificationIcons: Record<
  NotificationType,
  { icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  info: {
    icon: Info,
    className: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950',
  },
  success: {
    icon: CheckCircle,
    className: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950',
  },
  warning: {
    icon: AlertTriangle,
    className: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-950',
  },
  error: {
    icon: AlertCircle,
    className: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950',
  },
};

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotificationStore();

  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = notifications.filter((n) => n.read);

  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleClearAll = () => {
    clearAll();
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-medium text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-8 text-xs"
              >
                <CheckCheck className="mr-1 h-3 w-3" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="mb-2 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm font-medium">No notifications</p>
            <p className="text-xs text-muted-foreground">
              You&apos;re all caught up!
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            {/* Unread notifications */}
            {unreadNotifications.length > 0 && (
              <div>
                {unreadNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onRemove={removeNotification}
                  />
                ))}
              </div>
            )}

            {/* Separator if both unread and read exist */}
            {unreadNotifications.length > 0 && readNotifications.length > 0 && (
              <Separator className="my-2" />
            )}

            {/* Read notifications */}
            {readNotifications.length > 0 && (
              <div className="opacity-60">
                {readNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onRemove={removeNotification}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        )}

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-red-600 hover:bg-red-100 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
              onClick={handleClearAll}
            >
              Clear all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onRemove,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { icon: Icon, className } = notificationIcons[notification.type as NotificationType];

  return (
    <div
      className={cn(
        'group relative border-b border-border p-4 transition-colors hover:bg-muted/50',
        !notification.read && 'bg-muted/30'
      )}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full', className)}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium">{notification.title}</p>
            {!notification.read && (
              <div className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-600" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">{notification.message}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
          </p>

          {/* Action button */}
          {notification.actionUrl && notification.actionLabel && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              asChild
            >
              <a
                href={notification.actionUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {notification.actionLabel}
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {!notification.read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onMarkAsRead(notification.id)}
          >
            <Check className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-red-600 hover:bg-red-100 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
          onClick={() => onRemove(notification.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
