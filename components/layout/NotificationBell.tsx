'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';

interface Notification {
  notifId: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/notifications?limit=15');
        const data = await res.json();
        if (!cancelled) {
          setNotifications(data.notifications || []);
          setUnread(data.unread || 0);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    } catch (error) {
      console.error('Error marking notifications read:', error);
    }
  };

  const markRead = async (notif: Notification) => {
    if (!notif.isRead) {
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notifId: notif.notifId }),
        });
        setNotifications((prev) =>
          prev.map((n) => (n.notifId === notif.notifId ? { ...n, isRead: true } : n))
        );
        setUnread((u) => Math.max(0, u - 1));
      } catch (error) {
        console.error('Error marking notification read:', error);
      }
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-1 rounded-full hover:bg-gray-100"
      >
        <Bell className="h-6 w-6 text-gray-600" />
        {unread > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 text-[10px] leading-4 text-center bg-red-500 text-white rounded-full">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Mark all read
                </button>
              )}
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-xs text-blue-600 hover:underline"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-sm text-gray-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No notifications</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notifications.map((notif) => {
                  const inner = (
                    <div
                      className={`p-3 cursor-pointer hover:bg-gray-50 ${
                        !notif.isRead ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => markRead(notif)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-800">{notif.title}</p>
                        {!notif.isRead && (
                          <span className="mt-1 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(notif.createdAt).toLocaleString()}
                      </p>
                    </div>
                  );
                  return (
                    <li key={notif.notifId}>
                      {notif.link ? (
                        <Link href={notif.link}>{inner}</Link>
                      ) : (
                        inner
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}