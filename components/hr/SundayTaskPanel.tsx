'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { CheckCircle2, Gift } from 'lucide-react';

interface SundayTask {
  id: string;
  name: string;
  amount: string;
  description: string | null;
  isActive?: boolean;
}

interface IncentiveRecord {
  incentiveId: string;
  type: string;
  taskTypeId: string | null;
  taskTypeName: string | null;
  amount: string;
}

function istDayShort(): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
  }).format(new Date());
}

function istDateString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function SundayTaskPanel() {
  const { userId, sessionClaims } = useAuth();
  const clinicId = (sessionClaims?.primaryClinicId as string) || 'clinic_a';
  const [tasks, setTasks] = useState<SundayTask[]>([]);
  const [done, setDone] = useState<IncentiveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isSunday = istDayShort() === 'Sun';

  useEffect(() => {
    if (!userId || !isSunday) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const taskRes = await fetch('/api/sunday-tasks');
        const taskData = await taskRes.json();
        const today = istDateString();
        const incRes = await fetch(
          `/api/incentives?userId=${userId}&clinicId=${clinicId}&startDate=${today}&endDate=${today}`
        );
        const incData = await incRes.json();
        if (!cancelled) {
          setTasks((taskData.records || []).filter((t: SundayTask) => t.isActive !== false));
          const sundayTasks = (incData.records || []).filter(
            (r: IncentiveRecord) => r.type === 'SUNDAY_TASK'
          );
          setDone(sundayTasks);
        }      } catch (error) {
        console.error('Error loading Sunday tasks:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userId, clinicId, isSunday]);

  const handleComplete = async (taskId: string) => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/sunday-tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, clinicId }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone((prev) => [
          ...prev,
          {
            incentiveId: data.incentiveId,
            type: 'SUNDAY_TASK',
            taskTypeId: data.taskId,
            taskTypeName: data.taskName,
            amount: String(data.amount),
          },
        ]);
      } else {
        alert(data.error || 'Failed to complete task');
      }
    } catch (error) {
      console.error('Error completing Sunday task:', error);
      alert('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isSunday) return null;

  const doneIds = new Set(done.map((d) => d.taskTypeId));
  const total = done.reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <div className="max-w-2xl mb-8">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-1">
          <Gift className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold">Sunday Tasks (Today is Sunday)</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Complete a task to earn its incentive. Each task can be completed once per day.
        </p>

        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-gray-500">No Sunday tasks available right now.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => {
              const isDone = doneIds.has(task.id);
              return (
                <li
                  key={task.id}
                  className="flex items-center justify-between border border-gray-200 rounded-md px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{task.name}</p>
                    <p className="text-xs text-gray-500">
                      &#8377;{Number(task.amount).toLocaleString('en-IN')}
                    </p>
                  </div>
                  {isDone ? (
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Done
                    </span>
                  ) : (
                    <button
                      onClick={() => handleComplete(task.id)}
                      disabled={submitting}
                      className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                    >
                      {submitting ? '...' : 'Complete'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {done.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-900">
              Today&apos;s Incentives: &#8377;{total.toLocaleString('en-IN')} (
              {done.length} task{done.length === 1 ? '' : 's'} completed)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}