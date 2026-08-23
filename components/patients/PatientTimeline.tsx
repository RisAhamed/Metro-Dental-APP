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
  Receipt,
  Activity,
} from 'lucide-react';
import { EmptyState, formatMoney, formatDateDDMMM } from './shared';

export type TimelineType =
  | 'APPOINTMENT'
  | 'VISIT'
  | 'PROCEDURE'
  | 'PAYMENT'
  | 'TREATMENT_PLAN'
  | 'FILE'
  | 'CLINICAL_NOTE'
  | 'INVOICE'
  | 'VITAL_SIGNS';

export interface TimelineEntry {
  id: string;
  type: TimelineType;
  date: string;
  title: string;
  details: Record<string, unknown>;
}

const TYPE_META: Record<
  TimelineType,
  { label: string; icon: typeof Calendar; chip: string; bar: string }
> = {
  APPOINTMENT: { label: 'Appointment', icon: Calendar, chip: 'bg-blue-50 text-blue-700 border-blue-200', bar: 'bg-blue-500' },
  VISIT: { label: 'Visit / Session', icon: Stethoscope, chip: 'bg-teal-50 text-teal-700 border-teal-200', bar: 'bg-teal-500' },
  PROCEDURE: { label: 'Procedure Performed', icon: Syringe, chip: 'bg-purple-50 text-purple-700 border-purple-200', bar: 'bg-purple-500' },
  PAYMENT: { label: 'Payment', icon: Wallet, chip: 'bg-green-50 text-green-700 border-green-200', bar: 'bg-green-500' },
  TREATMENT_PLAN: { label: 'Treatment Plan', icon: ClipboardList, chip: 'bg-orange-50 text-orange-700 border-orange-200', bar: 'bg-orange-500' },
  FILE: { label: 'File Uploaded', icon: FolderOpen, chip: 'bg-cyan-50 text-cyan-700 border-cyan-200', bar: 'bg-cyan-500' },
  CLINICAL_NOTE: { label: 'Clinical Note', icon: FileText, chip: 'bg-indigo-50 text-indigo-700 border-indigo-200', bar: 'bg-indigo-500' },
  INVOICE: { label: 'Invoice', icon: Receipt, chip: 'bg-rose-50 text-rose-700 border-rose-200', bar: 'bg-rose-500' },
  VITAL_SIGNS: { label: 'Vital Signs', icon: Activity, chip: 'bg-red-50 text-red-600 border-red-200', bar: 'bg-red-400' },
};

const FILTERS: (TimelineType | 'ALL')[] = [
  'ALL',
  'APPOINTMENT',
  'PROCEDURE',
  'CLINICAL_NOTE',
  'INVOICE',
  'PAYMENT',
  'TREATMENT_PLAN',
  'VITAL_SIGNS',
  'FILE',
];

function timeRange(d: Record<string, unknown>): string {
  const start = d.time ? new Date(d.time as string) : null;
  const end = d.endTime ? new Date(d.endTime as string) : null;
  if (!start) return '';
  const fmt = (x: Date) => x.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return end ? `${fmt(start)} to ${fmt(end)}` : fmt(start);
}

interface PatientTimelineProps {
  entries: TimelineEntry[];
  loading: boolean;
}

interface DayGroup {
  dateKey: string;
  heading: string;
  entries: TimelineEntry[];
}

export function PatientTimeline({ entries, loading }: PatientTimelineProps) {
  const [filter, setFilter] = useState<TimelineType | 'ALL'>('ALL');
  const [visibleDays, setVisibleDays] = useState(5);

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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <History className="h-5 w-5 text-blue-500" /> Patient Timeline
        </h3>
        <span className="text-xs text-gray-400">{entries.length} activities</span>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f);
              setVisibleDays(5);
            }}
            className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'ALL' ? `All (${entries.length})` : TYPE_META[f].label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading timeline...</p>
      ) : groups.length === 0 ? (
        <EmptyState icon={History} message="No activity recorded yet." />
      ) : (
        <>
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
            {groups.slice(0, visibleDays).map((group) => (
              <div key={group.dateKey}>
                {/* Date header */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-bold text-gray-800">{group.heading}</span>
                  <span className="flex-1 h-px bg-gray-100" />
                  <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                    {group.entries.length} {group.entries.length === 1 ? 'activity' : 'activities'}
                  </span>
                </div>

                <div className="space-y-3 pl-1">
                  {group.entries.map((entry) => {
                    const meta = TYPE_META[entry.type];
                    const Icon = meta.icon;
                    const d = entry.details;
                    return (
                      <div
                        key={entry.id}
                        className="relative bg-white border border-gray-100 rounded-lg p-4 hover:border-gray-200 hover:shadow-sm transition-all"
                      >
                        <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-r ${meta.bar}`} />
                        <div className="flex items-start gap-3 pl-2">
                          <span className={`h-9 w-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${meta.chip}`}>
                            <Icon className="h-4 w-4" />
                          </span>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-semibold uppercase tracking-wide">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded border ${meta.chip}`}>
                                  {meta.label}
                                </span>
                              </p>
                              <span className="text-xs text-gray-400 whitespace-nowrap">
                                {new Date(entry.date).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>

                            <div className="mt-1.5 space-y-0.5 text-sm text-gray-700">
                              {entry.type === 'APPOINTMENT' && (
                                <>
                                  <p className="font-medium">Dr. {(d.doctorName as string) || '—'}</p>
                                  <p className="text-gray-500">
                                    {timeRange(d)}
                                    {d.tokenNumber ? ` · Token ${(d.tokenNumber as string)}` : ''}
                                  </p>
                                  <StatusLine status={String(d.status)} />
                                </>
                              )}

                              {entry.type === 'PROCEDURE' && (
                                <>
                                  <p className="font-medium text-gray-900">
                                    {entry.title}
                                    {Array.isArray(d.toothNumbers) && d.toothNumbers.length > 0 && (
                                      <span className="ml-2 text-blue-600 text-xs">
                                        [{(d.toothNumbers as number[]).join('] [')}]
                                      </span>
                                    )}
                                    {d.isFullMouth ? (
                                      <span className="ml-2 text-xs text-gray-400">(Full Mouth)</span>
                                    ) : null}
                                  </p>
                                  {(d.completedBy as string) && (
                                    <p className="text-gray-500 text-xs">by Dr. {String(d.completedBy)}</p>
                                  )}
                                  <p className="text-xs text-gray-500">
                                    Cost {formatMoney(d.cost as number)} · Discount{' '}
                                    {formatMoney(d.discount as number)} · Total{' '}
                                    <span className="font-semibold text-gray-700">
                                      {formatMoney(d.total as number)}
                                    </span>
                                  </p>
                                  {(d.notes as string) && (
                                    <p className="text-xs text-gray-400 italic">{String(d.notes)}</p>
                                  )}
                                </>
                              )}

                              {entry.type === 'CLINICAL_NOTE' && (
                                <>
                                  {((d.doctorsInvolved as Array<{ doctorName: string }> | undefined)?.length ?? 0) > 0 && (
                                    <p className="text-xs text-gray-500">
                                      Dr.{' '}
                                      {(d.doctorsInvolved as Array<{ doctorName: string }>)
                                        .map((x) => x.doctorName)
                                        .join(' & ')}
                                      {d.injectionGiven ? ' · 💉 Injection given' : ''}
                                    </p>
                                  )}
                                  {(d.chiefComplaint as string) && (
                                    <p>
                                      <span className="text-[10px] uppercase font-semibold text-gray-400 mr-1.5">Complaint</span>
                                      {String(d.chiefComplaint)}
                                    </p>
                                  )}
                                  {(d.diagnosis as string) && (
                                    <p>
                                      <span className="text-[10px] uppercase font-semibold text-gray-400 mr-1.5">Diagnosis</span>
                                      {String(d.diagnosis)}
                                    </p>
                                  )}
                                  {(d.treatmentGiven as string) && (
                                    <p>
                                      <span className="text-[10px] uppercase font-semibold text-gray-400 mr-1.5">Treatment</span>
                                      {String(d.treatmentGiven)}
                                    </p>
                                  )}
                                </>
                              )}

                              {entry.type === 'PAYMENT' && (
                                <>
                                  <p>
                                    <span className="font-semibold text-green-700">
                                      {formatMoney(d.amount as number)}
                                    </span>{' '}
                                    via {String(d.mode).replace(/_/g, ' ')}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Recorded by {(d.recordedByName as string) || '—'}
                                  </p>
                                </>
                              )}

                              {entry.type === 'TREATMENT_PLAN' && (
                                <>
                                  <p className="font-medium text-gray-900">{entry.title}</p>
                                  <p className="text-xs text-gray-500">
                                    {(d.procedureCount as number) ?? 0} procedure(s) · Estimated{' '}
                                    <span className="font-semibold text-gray-700">
                                      {formatMoney(d.grandTotal as number)}
                                    </span>{' '}
                                    · Status {String(d.status)}
                                  </p>
                                </>
                              )}

                              {entry.type === 'FILE' && (
                                <FileLink entryId={entry.id} title={entry.title} />
                              )}

                              {entry.type === 'INVOICE' && (
                                <>
                                  <p className="font-medium text-gray-900">
                                    {String(d.invoiceNumber)}
                                    {' · '}
                                    {((d.procedures as string[]) || []).slice(0, 2).join(', ') || entry.title}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Amount {formatMoney(d.total as number)} · Paid{' '}
                                    {formatMoney(d.paid as number)} · Due{' '}
                                    <span className={(d.due as number) > 0 ? 'text-red-600 font-semibold' : ''}>
                                      {formatMoney(d.due as number)}
                                    </span>
                                  </p>
                                  <StatusLine status={String(d.status)} />
                                </>
                              )}

                              {entry.type === 'VITAL_SIGNS' && (
                                <VitalsInline vitals={d.vitalSigns as Record<string, unknown>} />
                              )}

                              {entry.type === 'VISIT' && (
                                <p className="text-gray-600">{entry.title}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {groups.length > visibleDays && (
            <button
              onClick={() => setVisibleDays((v) => v + 5)}
              className="w-full mt-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md border border-gray-100"
            >
              Load Older Activity ({groups.length - visibleDays} more days)
            </button>
          )}
        </>
      )}
    </div>
  );
}

function StatusLine({ status }: { status: string }) {
  if (!status) return null;
  const map: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-700',
    CONFIRMED: 'bg-indigo-100 text-indigo-700',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    COMPLETED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
    NO_SHOW: 'bg-gray-200 text-gray-600',
    PAID: 'bg-green-100 text-green-700',
    PARTIALLY_PAID: 'bg-yellow-100 text-yellow-700',
    UNPAID: 'bg-red-100 text-red-700',
  };
  return (
    <span
      className={`inline-block mt-0.5 px-2 py-0.5 text-[10px] rounded-full font-semibold ${map[status] || 'bg-gray-100 text-gray-600'}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function FileLink({ entryId, title }: { entryId: string; title: string }) {
  const key = entryId.replace(/^file_/, '');
  return (
    <a
      href={`/api/upload/visit-file/download?key=${encodeURIComponent(key)}&name=${encodeURIComponent(title)}`}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
    >
      <FolderOpen className="h-3.5 w-3.5" /> View / Download — {title}
    </a>
  );
}

function VitalsInline({ vitals }: { vitals: Record<string, unknown> | undefined }) {
  if (!vitals) return null;
  const items: string[] = [];
  if (vitals.bloodPressure) items.push(`BP ${vitals.bloodPressure}`);
  if (vitals.pulseRate) items.push(`Pulse ${vitals.pulseRate} bpm`);
  if (vitals.spo2) items.push(`SpO₂ ${vitals.spo2}%`);
  if (vitals.bloodSugar) items.push(`Sugar ${vitals.bloodSugar} mg/dL`);
  if (vitals.weight) items.push(`${vitals.weight} kg`);
  if (items.length === 0) return null;
  return <p className="text-xs text-gray-500">{items.join(' • ')}</p>;
}
