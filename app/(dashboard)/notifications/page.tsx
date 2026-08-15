'use client';

import { useState, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  notifId: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  clinicId: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_EMOJI: Record<string, string> = {
  REFERRAL_1500: '💰',
  WEEKLY_ATTENDANCE_500: '🎉',
  SUNDAY_TASK: '⭐',
  LAB_STAGE_COMPLETED: '🔬',
  LEAVE_UPDATE: '📅',
  CORRECTION_UPDATE: '✅',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const url =
          filter === 'unread'
            ? '/api/notifications?unread=true&limit=100'
            : '/api/notifications?limit=100';
        const res = await fetch(url);
        const data = await res.json();
        if (!cancelled) setNotifications(data.notifications || []);
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
  }, [filter]);

  const markRead = async (notifId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifId }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.notifId === notifId ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all read:', error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" />
          Notifications
          {unreadCount > 0 && (
            <span className="text-sm bg-red-500 text-white px-2 py-0.5 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex rounded-md overflow-hidden border border-gray-200">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-sm ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 text-sm ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Unread
            </button>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="px-3 py-1.5 text-sm text-blue-600 hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Bell className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No notifications</p>
          <p className="text-sm text-gray-400">
            {filter === 'unread'
              ? 'You have no unread notifications'
              : 'New notifications will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.notifId}
              className={`bg-white rounded-lg shadow p-4 transition-colors ${
                !notification.isRead ? 'border-l-4 border-blue-500' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">{TYPE_EMOJI[notification.type] || '📬'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  {notification.link && (
                    <Link
                      href={notification.link}
                      className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                    >
                      View details →
                    </Link>
                  )}
                </div>
                {!notification.isRead && (
                  <button
                    onClick={() => markRead(notification.notifId)}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                    aria-label="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
