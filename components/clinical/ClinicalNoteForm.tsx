'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, X, Plus, PanelRightClose, Search } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { useAutoResizeTextarea } from '@/hooks/useAutoResizeTextarea';

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

interface ClinicalNoteFormProps {
  patientId: string;
  clinicId: string;
  doctorId: string;
  doctorName: string;
  existingNote?: ClinicalNote | null;
  onSaved: (note: ClinicalNote) => void;
  onCancel: () => void;
}

interface LookupItem {
  id: string;
  category: string;
  name: string;
  clinicId: string | null;
  isActive: boolean;
  createdAt: string;
}

const CATEGORIES = [
  { key: 'chiefComplaints', label: 'Chief Complaints', lookupCategory: 'complaint' },
  { key: 'observations', label: 'Observations', lookupCategory: 'observation' },
  { key: 'diagnoses', label: 'Diagnoses', lookupCategory: 'diagnosis' },
  { key: 'investigations', label: 'Investigations', lookupCategory: 'investigation' },
] as const;

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function OptionsPanel({
  category,
  label,
  onSelect,
  onClose,
}: {
  category: string;
  label: string;
  onSelect: (name: string) => void;
  onClose: () => void;
}) {
  const [lookups, setLookups] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [adding, setAdding] = useState(false);
  const debouncedSearch = useDebounce(searchText, 250);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, [category]);

  useEffect(() => {
    let active = true;
    fetch(`/api/clinical-note-lookups?${new URLSearchParams({ category, search: debouncedSearch })}`)
      .then((r) => r.json())
      .then((data) => {
        if (active) {
          setLookups(data.lookups || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setLookups([]);
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [debouncedSearch, category]);

  const filteredLookups = lookups;

  const handleAddItem = useCallback(async () => {
    const name = newItemName.trim();
    if (!name) return;
    setAdding(true);
    try {
      const res = await fetch('/api/clinical-note-lookups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, name }),
      });
      const data = await res.json();
      if (data.lookup) {
        setLookups((prev) => [...prev, data.lookup].sort((a, b) => a.name.localeCompare(b.name)));
        setNewItemName('');
        onSelect(name);
      }
    } catch (error) {
      console.error('Failed to add lookup:', error);
    } finally {
      setAdding(false);
    }
  }, [newItemName, category, onSelect]);

  return (
    <div
      ref={panelRef}
      className="fixed right-0 top-0 z-50 h-full w-80 bg-white border-l border-gray-200 shadow-2xl flex flex-col"
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 bg-gray-50">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
          <p className="text-xs text-gray-500">Select or add new</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
          title="Close panel"
        >
          <PanelRightClose className="h-5 w-5" />
        </button>
      </div>

      <div className="px-3 py-2 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search options..."
            className="w-full rounded-md border border-gray-300 bg-white pl-8 pr-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          </div>
        ) : filteredLookups.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-500">No options found.</p>
          </div>
        ) : (
          <div className="py-1">
            {filteredLookups.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.name)}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-gray-50 last:border-0"
              >
                {item.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 px-3 py-3 bg-gray-50">
        <p className="text-[10px] text-gray-400 mb-2">
          {filteredLookups.length} options available
        </p>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddItem();
              }
            }}
            placeholder="Add new item..."
            className="flex-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleAddItem}
            disabled={adding || !newItemName.trim()}
            className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionTextarea({
  value,
  onChange,
  onFocusActive,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  onFocusActive: () => void;
  placeholder: string;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const { resize, handleInput } = useAutoResizeTextarea();

  useEffect(() => {
    resize(taRef.current);
  }, [value, resize]);

  return (
    <textarea
      ref={taRef}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        handleInput(e);
      }}
      onFocus={onFocusActive}
      placeholder={placeholder}
      rows={1}
      className="w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 overflow-hidden"
    />
  );
}

function DynamicSection({
  label,
  category,
  values,
  onChange,
  onCategoryFocus,
}: {
  label: string;
  category: string;
  values: string[];
  onChange: (vals: string[]) => void;
  onCategoryFocus: (cat: string) => void;
}) {
  function handleUpdate(index: number, val: string) {
    const next = [...values];
    next[index] = val;
    onChange(next);
  }

  function handleRemove(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  function handleAdd() {
    onChange([...values, '']);
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      <div className="space-y-1.5">
        {values.map((val, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <div className="flex-1">
              <SectionTextarea
                value={val}
                onChange={(v) => handleUpdate(i, v)}
                onFocusActive={() => onCategoryFocus(category)}
                placeholder={`Enter ${label.toLowerCase().replace(/s$/, '')}...`}
              />
            </div>
            {values.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="mt-1 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add {label.replace(/s$/, '')}
        </button>
      </div>
    </div>
  );
}

export default function ClinicalNoteForm({
  patientId,
  clinicId,
  doctorId,
  doctorName,
  existingNote,
  onSaved,
  onCancel,
}: ClinicalNoteFormProps) {
  const { getToken } = useAuth();
  const { resize, handleInput } = useAutoResizeTextarea();
  const notesTaRef = useRef<HTMLTextAreaElement>(null);

  const [chiefComplaints, setChiefComplaints] = useState<string[]>(
    existingNote?.chiefComplaints?.length ? existingNote.chiefComplaints : ['']
  );
  const [observations, setObservations] = useState<string[]>(
    existingNote?.observations?.length ? existingNote.observations : ['']
  );
  const [diagnoses, setDiagnoses] = useState<string[]>(
    existingNote?.diagnoses?.length ? existingNote.diagnoses : ['']
  );
  const [investigations, setInvestigations] = useState<string[]>(
    existingNote?.investigations?.length ? existingNote.investigations : ['']
  );
  const [notes, setNotes] = useState(existingNote?.notes || '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [loadingRecent, setLoadingRecent] = useState(!existingNote);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    if (existingNote) return;
    let active = true;
    fetch(`/api/patients/${patientId}/recent-notes?limit=3`)
      .then((r) => r.json())
      .then((data) => {
        if (!active || !data.notes?.length) return;
        const combined = data.notes
          .map((n: ClinicalNote) => n.notes)
          .filter(Boolean)
          .join('\n\n---\n\n');
        if (combined) setNotes(combined);
      })
      .catch(() => {})
      .finally(() => { if (active) setLoadingRecent(false); });
    return () => { active = false; };
  }, [patientId, existingNote]);

  useEffect(() => {
    if (notesTaRef.current) resize(notesTaRef.current);
  }, [notes, resize]);

  const handleCategoryFocus = useCallback((cat: string) => {
    setActiveCategory(cat);
  }, []);

  const handleOptionSelect = useCallback((name: string) => {
    if (!activeCategory) return;

    const categoryMap: Record<string, { values: string[]; setter: (v: string[]) => void }> = {
      complaint: { values: chiefComplaints, setter: setChiefComplaints },
      observation: { values: observations, setter: setObservations },
      diagnosis: { values: diagnoses, setter: setDiagnoses },
      investigation: { values: investigations, setter: setInvestigations },
    };

    const cat = categoryMap[activeCategory];
    if (!cat) return;

    const lastIdx = cat.values.length - 1;
    const next = [...cat.values];
    next[lastIdx] = name;
    next.push('');
    cat.setter(next);
  }, [activeCategory, chiefComplaints, observations, diagnoses, investigations]);

  const handlePanelClose = useCallback(() => {
    setActiveCategory(null);
  }, []);

  const activeCategoryLabel = CATEGORIES.find((c) => c.lookupCategory === activeCategory)?.label || '';

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    try {
      const token = await getToken();
      const url = existingNote
        ? `/api/clinical-notes/${existingNote.noteId}`
        : `/api/patients/${patientId}/clinical-notes`;
      const method = existingNote ? 'PUT' : 'POST';
      const clean = (arr: string[]) => arr.filter((v) => v.trim());
      const payload = {
        clinicId,
        doctorId: doctorId || 'system',
        doctorName: doctorName || 'Unknown',
        chiefComplaints: clean(chiefComplaints),
        observations: clean(observations),
        diagnoses: clean(diagnoses),
        investigations: clean(investigations),
        notes: notes.trim() || null,
      };
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('Save clinical note failed:', res.status, data);
        setSaveError(data.error || 'Failed to save. Check console for details.');
        return;
      }
      if (data.note) onSaved(data.note);
    } catch (error) {
      console.error('Failed to save clinical note:', error);
      setSaveError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const categoryValues: Record<string, string[]> = {
    chiefComplaints,
    observations,
    diagnoses,
    investigations,
  };

  const categorySetters: Record<string, (v: string[]) => void> = {
    chiefComplaints: setChiefComplaints,
    observations: setObservations,
    diagnoses: setDiagnoses,
    investigations: setInvestigations,
  };

  return (
    <div className="flex min-h-0">
      <div className={`flex-1 rounded-lg border bg-white p-4 sm:p-5 space-y-4 transition-all duration-200 ${activeCategory ? 'mr-80' : ''}`}>
        <h3 className="text-base font-semibold text-gray-900">
          {existingNote ? 'Edit Clinical Note' : 'New Clinical Note'}
        </h3>

        {saveError && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {saveError}
          </div>
        )}

        {CATEGORIES.map(({ key, label, lookupCategory }) => (
          <DynamicSection
            key={key}
            label={label}
            category={lookupCategory}
            values={categoryValues[key]}
            onChange={categorySetters[key]}
            onCategoryFocus={handleCategoryFocus}
          />
        ))}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes</label>
          <div className="relative">
            <textarea
              ref={notesTaRef}
              value={notes}
              onChange={(e) => { setNotes(e.target.value); handleInput(e); }}
              onFocus={() => setActiveCategory(null)}
              placeholder="Free-text clinical notes..."
              rows={3}
              className="w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 overflow-hidden"
            />
            {loadingRecent && (
              <div className="absolute top-2 right-2">
                <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {existingNote ? 'Update Note' : 'Save Clinical Note'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {activeCategory && (
        <OptionsPanel
          key={activeCategory}
          category={activeCategory}
          label={activeCategoryLabel}
          onSelect={handleOptionSelect}
          onClose={handlePanelClose}
        />
      )}
    </div>
  );
}
