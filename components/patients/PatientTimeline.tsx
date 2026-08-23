'use client';

import { useMemo, useState } from 'react';
import {
  History,
  Calendar,
  Stethoscope,
  Syringe,
  Wallet,
  ClipboardList,
  FolderOpen,
  FileText,
} from 'lucide-react';
import { EmptyState, formatMoney, formatDateDDMMM } from './shared';

export type TimelineType =
  | 'APPOINTMENT'
  | 'VISIT'
  | 'PROCEDURE'
  | 'PAYMENT'
  | 'TREATMENT_PLAN'
  | 'FILE'
  | 'CLINICAL_NOTE';

export interface TimelineEntry {
  id: string;
  type: TimelineType;
  date: string;
  title: string;
  details: Record<string, unknown>;
}

const TYPE_META: Record<TimelineType, { label: string; icon: typeof Calendar; color: string }> = {
  APPOINTMENT: { label: 'Appointment', icon: Calendar, color: 'text-blue-500' },
  VISIT: { label: 'Visit / Session', icon: Stethoscope, color: 'text-teal-500' },
  PROCEDURE: { label: 'Procedure Performed', icon: Syringe, color: 'text-purple-500' },
  PAYMENT: { label: 'Payment', icon: Wallet, color: 'text-green-500' },
  TREATMENT_PLAN: { label: 'Treatment Plan', icon: ClipboardList, color: 'text-orange-500' },
  FILE: { label: 'File Uploaded', icon: FolderOpen, color: 'text-cyan-500' },
  CLINICAL_NOTE: { label: 'Clinical Note', icon: FileText, color: 'text-indigo-500' },
};

const FILTERS: (TimelineType | 'ALL')[] = [
  'ALL',
  'APPOINTMENT',
  'PROCEDURE',
  'CLINICAL_NOTE',
  'PAYMENT',
  'TREATMENT_PLAN',
  'FILE',
];

interface PatientTimelineProps {
  entries: TimelineEntry[];
  loading: boolean;
}

function entryBody(entry: TimelineEntry): React.ReactNode {
  const d = entry.details;
  switch (entry.type) {
    case 'APPOINTMENT': {
      const time = d.time ? new Date(d.time as string) : null;
      const end = d.endTime ? new Date(d.endTime as string) : null;
      return (
        <>
          <p className="text-sm text-gray-700">
            Dr. {(d.doctorName as string) || '—'}
            {(d.isWalkIn as boolean) && (
              <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-700 px-1.5 rounded font-medium">
                WALK-IN
              </span>
            )}
          </p>
          {time && end && (
            <p className="text-xs text-gray-500">
              {formatDateDDMMM(time)} · {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} to{' '}
              {end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </>
      );
    }
    case 'PROCEDURE':
      return (
        <>
          <p className="text-sm text-gray-700">
            {(d.completedBy as string) || '—'}
            {d.toothNumber ? (
              <span className="ml-2 text-blue-600">[{d.toothNumber as string}]</span>
            ) : null}
          </p>
          <p className="text-xs text-gray-500">
            {entry.title} · Total {formatMoney(d.total as number)}
          </p>
        </>
      );
    case 'PAYMENT':
      return (
        <p className="text-sm text-gray-700">
          {(d.paymentId as string) || ''} Amount Paid:{' '}
          <span className="font-medium">{formatMoney(d.amount as number)}</span> via{' '}
          {String(d.mode).replace(/_/g, ' ')}
        </p>
      );
    case 'TREATMENT_PLAN':
      return (
        <p className="text-sm text-gray-700">
          {(d.procedureCount as number) ?? 0} procedure(s) · Estimated{' '}
          <span className="font-medium">{formatMoney(d.grandTotal as number)}</span>
        </p>
      );
    case 'FILE':
      return (
        <a
          href={String(d.url)}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-sm text-blue-600 hover:underline"
        >
          View / Download — {entry.title}
        </a>
      );
    default:
      return null;
  }
}

interface DayGroup {
  dateKey: string;
  heading: string;
  entries: TimelineEntry[];
}

export function PatientTimeline({ entries, loading }: PatientTimelineProps) {
  const [filter, setFilter] = useState<TimelineType | 'ALL'>('ALL');

  const groups = useMemo<DayGroup[]>(() => {
    const filtered =
      filter === 'ALL' ? entries : entries.filter((e) => e.type === filter);
    const map = new Map<string, DayGroup>();
    for (const e of filtered) {
      const date = new Date(e.date);
      const dateKey = date.toISOString().slice(0, 10);
      if (!map.has(dateKey)) {
        map.set(dateKey, {
          dateKey,
          heading: `${formatDateDDMMM(date)} · ${date.toLocaleDateString('en-IN', { weekday: 'long' })}`,
          entries: [],
        });
      }
      map.get(dateKey)!.entries.push(e);
    }
    return [...map.values()];
  }, [entries, filter]);

  return (
    <div>
      <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <History className="h-5 w-5 text-blue-500" /> Patient Timeline
      </h3>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'ALL' ? 'All Activity' : TYPE_META[f].label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading timeline...</p>
      ) : groups.length === 0 ? (
        <EmptyState icon={History} message="No activity recorded yet." />
      ) : (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          {groups.map((group) => (
            <div key={group.dateKey}>
              <p className="text-sm font-semibold text-gray-800 mb-2">{group.heading}</p>
              <div className="border-l-2 border-gray-100 ml-2 space-y-3 pl-4">
                {group.entries.map((entry) => {
                  const meta = TYPE_META[entry.type];
                  const Icon = meta.icon;
                  return (
                    <div key={entry.id} className="relative">
                      <span
                        className={`absolute -left-[26px] top-1 h-4 w-4 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center`}
                      >
                        <Icon className={`h-2.5 w-2.5 ${meta.color}`} />
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                          <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                          {meta.label}
                        </p>
                        <div className="mt-0.5">{entryBody(entry)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
