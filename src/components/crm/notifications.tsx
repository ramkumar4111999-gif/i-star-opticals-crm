'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Bell, Check, CheckCheck, Trash2, Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useCrmStore, type SectionKey } from '@/components/crm/store';
import { formatDistanceToNow } from 'date-fns';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

const typeConfig: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  info: {
    icon: Info,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-900/30',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/30',
  },
  success: {
    icon: CheckCircle2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
  },
  error: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/30',
  },
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('all');
  const prevIdsRef = useRef<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { setActiveSection } = useCrmStore();

  const filteredNotifications = filterType === 'all'
    ? notifications
    : notifications.filter(n => n.type === filterType);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: notifications.length };
    for (const n of notifications) {
      counts[n.type] = (counts[n.type] || 0) + 1;
    }
    return counts;
  }, [notifications]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      const items: NotificationItem[] = data.notifications ?? [];

      // Detect new ones for animation
      const newIds = new Set(items.map((n: NotificationItem) => n.id));
      const freshIds = new Set<string>();
      for (const id of newIds) {
        if (!prevIdsRef.current.has(id)) freshIds.add(id);
      }
      if (freshIds.size > 0) {
        setAnimatingIds(freshIds);
        setTimeout(() => setAnimatingIds(new Set()), 600);
      }
      prevIdsRef.current = newIds;

      setNotifications(items);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // silent
    }
  }, []);

  // Initial fetch + 30s polling
  useEffect(() => {
    fetchNotifications();
    pollRef.current = setInterval(fetchNotifications, 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchNotifications]);

  // Refresh when popover opens
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } catch {
      // silent
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
    } catch {
      // silent
    }
  }, []);

  const clearRead = useCallback(async () => {
    setNotifications((prev) => prev.filter((n) => !n.isRead));
    try {
      await fetch('/api/notifications', { method: 'DELETE' });
    } catch {
      // silent
    }
  }, []);

  const handleNotificationClick = useCallback(
    (n: NotificationItem) => {
      if (n.link) {
        setActiveSection(n.link as SectionKey);
        setOpen(false);
      }
      if (!n.isRead) markAsRead(n.id);
    },
    [setActiveSection, markAsRead],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative shrink-0 min-w-[44px] min-h-[44px] touch-manipulation">
          <Bell className="h-4.5 w-4.5 text-slate-600 dark:text-slate-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-950">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Notifications
            </span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="rounded-full text-[10px]">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 min-h-[44px] min-w-[44px] touch-manipulation"
                onClick={markAllRead}
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            {notifications.some((n) => n.isRead) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2.5 text-xs text-slate-500 hover:text-red-600 dark:hover:text-red-400 min-h-[44px] min-w-[44px] touch-manipulation"
                onClick={clearRead}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear read
              </Button>
            )}
          </div>
        </div>
        <Separator />

        {/* Filter pills */}
        {notifications.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 sm:px-4 md:px-6 py-2 flex-wrap">
            <button
              onClick={() => setFilterType('all')}
              className={`text-[11px] px-3 py-1.5 rounded-full transition-colors min-h-[44px] touch-manipulation ${filterType === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >All ({typeCounts.all})</button>
            {Object.entries(typeCounts).filter(([k]) => k !== 'all').map(([type, count]) => {
              const cfg = typeConfig[type];
              return cfg ? (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`text-[11px] px-3 py-1.5 rounded-full transition-colors min-h-[44px] touch-manipulation ${filterType === type ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >{type} ({count})</button>
              ) : null;
            })}
          </div>
        )}

        {/* Notification List */}
        <ScrollArea className="max-h-80">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="flex items-center justify-center h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-muted/60 mb-4">
                <Bell className="h-6 w-6 sm:h-8 sm:w-8 opacity-50" />
              </div>
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs mt-1 opacity-60">New notifications will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredNotifications.map((n) => {
                const cfg = typeConfig[n.type] ?? typeConfig.info;
                const Icon = cfg.icon;
                const isNew = animatingIds.has(n.id);
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-3 sm:px-4 py-3 cursor-pointer transition-all duration-300 hover-lift transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                      isNew ? 'animate-in slide-in-from-top-2 fade-in duration-300' : ''
                    } ${!n.isRead ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}>
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug">
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <span className="shrink-0 h-2 w-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 ring-2 ring-white dark:ring-slate-900" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 hidden sm:block">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.isRead && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(n.id);
                        }}
                        className="shrink-0 mt-0.5 p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center touch-manipulation"
                        aria-label="Mark as read"
                      >
                        <Check className="h-4 w-4 text-slate-400" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}