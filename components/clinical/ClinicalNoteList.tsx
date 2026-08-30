'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, FileText, Pencil, ChevronDown } from 'lucide-react';
import ClinicalNoteForm from './ClinicalNoteForm';

interface ClinicalNote {
  noteId: string;
  patientId: string;
  clinicId: string;
  doctorId: string;
  doctorName: string;
  date: string;
  chiefComplaints: string[];
  observations: string[];
  diagnoses: string[];
  investigations: string[];
  notes: string | null;
  createdAt: string;
  createdBy: string;
}

interface ClinicalNoteListProps {
  patientId: string;
  clinicId: string;
  doctorId: string;
  doctorName: string;
  userRole: string;
}

function NoteSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="py-2">
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 italic">None</p>
      ) : (
        <ul className="space-y-0.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
              <span className="text-gray-400 mt-0.5 flex-shrink-0">•</span>
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ClinicalNoteList({
  patientId,
  clinicId,
  doctorId,
  doctorName,
  userRole,
}: ClinicalNoteListProps) {
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<ClinicalNote | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const canEdit = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'GENERAL_DOCTOR', 'ASSISTANT_DOCTOR'].includes(userRole);

  useEffect(() => {
    let active = true;
    fetch(`/api/patients/${patientId}/clinical-notes`)
      .then((r) => r.json())
      .then((data) => {
        if (active) {
          const allNotes = data.notes || [];
          setNotes(allNotes);
          setExpandedNotes(new Set(allNotes.length > 0 ? [allNotes[0].noteId] : []));
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [patientId]);

  async function handleDelete(noteId: string) {
    if (!confirm('Delete this clinical note?')) return;
    setDeleting(noteId);
    try {
      const res = await fetch(`/api/clinical-notes/${noteId}`, { method: 'DELETE' });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.noteId !== noteId));
      }
    } catch (error) {
      console.error('Failed to delete clinical note:', error);
    } finally {
      setDeleting(null);
    }
  }

  function handleSaved(note: ClinicalNote) {
    if (editingNote) {
      setNotes((prev) => prev.map((n) => (n.noteId === note.noteId ? note : n)));
    } else {
      setNotes((prev) => [note, ...prev]);
      setExpandedNotes((prev) => new Set([note.noteId, ...prev]));
    }
    setShowForm(false);
    setEditingNote(null);
  }

  function toggleExpand(noteId: string) {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (showForm || editingNote) {
    return (
      <ClinicalNoteForm
        patientId={patientId}
        clinicId={clinicId}
        doctorId={doctorId}
        doctorName={doctorName}
        existingNote={editingNote}
        onSaved={handleSaved}
        onCancel={() => { setShowForm(false); setEditingNote(null); }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Clinical Notes</h3>
        {canEdit && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Note
          </button>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center">
          <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No clinical notes yet.</p>
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <Plus className="h-3.5 w-3.5" /> Add First Note
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const isExpanded = expandedNotes.has(note.noteId);
            const date = new Date(note.date);
            const dateStr = date.toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });
            const timeStr = date.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });

            return (
              <div
                key={note.noteId}
                className="rounded-lg border border-gray-200 bg-white overflow-hidden"
              >
                <div className="px-5 pt-4 pb-3 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                        Clinical Notes
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {dateStr} · {timeStr}
                      </p>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setEditingNote(note)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(note.noteId)}
                          disabled={deleting === note.noteId}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {deleting === note.noteId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isExpanded ? (
                  <div className="px-5 py-2 divide-y divide-gray-50">
                    <NoteSection title="Chief Complaints" items={note.chiefComplaints} />
                    <NoteSection title="Observations" items={note.observations} />
                    <NoteSection title="Diagnoses" items={note.diagnoses} />
                    <NoteSection title="Investigations" items={note.investigations} />
                    <div className="py-2">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                        Notes
                      </h4>
                      {note.notes ? (
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {note.notes}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No notes</p>
                      )}
                    </div>
                    <div className="py-3">
                      <p className="text-xs text-gray-500">
                        Noted by <span className="font-medium text-gray-700">Dr. {note.doctorName || 'Doctor'}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        on {dateStr}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleExpand(note.noteId)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(note.noteId); } }}
                    className="w-full px-5 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <p className="text-xs text-gray-500">
                      {note.chiefComplaints.length > 0
                        ? note.chiefComplaints.slice(0, 2).join(', ') + (note.chiefComplaints.length > 2 ? '...' : '')
                        : 'No complaints'}
                    </p>
                    <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
