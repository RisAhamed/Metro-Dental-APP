'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, FileText } from 'lucide-react';
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

  const canEdit = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'GENERAL_DOCTOR', 'ASSISTANT_DOCTOR'].includes(userRole);

  useEffect(() => {
    let active = true;
    fetch(`/api/patients/${patientId}/clinical-notes`)
      .then((r) => r.json())
      .then((data) => { if (active) setNotes(data.notes || []); })
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
    }
    setShowForm(false);
    setEditingNote(null);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Clinical Notes</h3>
        {canEdit && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="mr-1 h-4 w-4" /> Add Note
          </button>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">No clinical notes yet.</p>
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Plus className="mr-1 h-4 w-4" /> Add First Note
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.noteId} className="rounded-lg border bg-white p-4">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{note.doctorName}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(note.date).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingNote(note)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(note.noteId)}
                      disabled={deleting === note.noteId}
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deleting === note.noteId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {note.chiefComplaints.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-500">Chief Complaints:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {note.chiefComplaints.map((c) => (
                        <span key={c} className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                {note.observations.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-500">Observations:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {note.observations.map((o) => (
                        <span key={o} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{o}</span>
                      ))}
                    </div>
                  </div>
                )}
                {note.diagnoses.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-500">Diagnoses:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {note.diagnoses.map((d) => (
                        <span key={d} className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700">{d}</span>
                      ))}
                    </div>
                  </div>
                )}
                {note.investigations.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-500">Investigations:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {note.investigations.map((i) => (
                        <span key={i} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{i}</span>
                      ))}
                    </div>
                  </div>
                )}
                {note.notes && (
                  <div>
                    <span className="text-xs font-medium text-gray-500">Notes:</span>
                    <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{note.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
