'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, X } from 'lucide-react';
import type { ProcedureOption } from './ProcedureSearch';

interface ProceduresSidebarProps {
  onSelect: (procedure: ProcedureOption) => void;
}

export function ProceduresSidebar({ onSelect }: ProceduresSidebarProps) {
  const [procedures, setProcedures] = useState<ProcedureOption[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState('0');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const state = { cancelled: false };
    const load = async () => {
      try {
        const res = await fetch('/api/procedures-catalog?limit=100');
        const data = await res.json();
        if (!state.cancelled) {
          const mapped: ProcedureOption[] = (data.procedures || []).map((p: { id: string; name: string; defaultCost: string }) => ({
            id: p.id,
            name: p.name,
            defaultCost: p.defaultCost,
          }));
          setProcedures(mapped);
        }
      } catch (error) {
        console.error('ProceduresSidebar load error:', error);
      } finally {
        if (!state.cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      state.cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return procedures;
    return procedures.filter((p) => p.name.toLowerCase().includes(q));
  }, [procedures, query]);

  const saveNewProcedure = async () => {
    const name = newName.trim();
    if (!name) {
      setFormError('Procedure name is required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch('/api/procedures-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, defaultCost: newCost || '0' }),
      });
      const data = await res.json();
      if (!res.ok || !data.procedure) {
        setFormError(data.error || 'Failed to save procedure.');
        return;
      }
      const created: ProcedureOption = {
        id: data.procedure.id,
        name: data.procedure.name,
        defaultCost: String(data.procedure.defaultCost ?? newCost ?? '0'),
      };
      setProcedures((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setModalOpen(false);
      setNewName('');
      setNewCost('0');
      onSelect(created); // auto-add to the current plan
    } catch (error) {
      console.error('Add procedure error:', error);
      setFormError('Failed to save procedure.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-[300px] flex-shrink-0 bg-white rounded-lg shadow flex flex-col h-[600px] sticky top-6">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Procedures Catalog</h3>
          <button
            type="button"
            onClick={() => {
              setFormError('');
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">Click to add to plan</p>
        <div className="relative mt-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filter procedures..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-sm text-gray-500 p-4">Loading procedures...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-500 p-4">No procedures found.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((proc) => (
              <button
                key={proc.id}
                type="button"
                onClick={() => onSelect(proc)}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center justify-between gap-2 group"
              >
                <span className="text-sm text-gray-800 group-hover:text-blue-700 truncate">{proc.name}</span>
                <span className="text-xs font-medium text-gray-500 flex-shrink-0">
                  ₹{Number(proc.defaultCost || 0).toLocaleString('en-IN')}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <p className="text-xs text-gray-500 text-center">{filtered.length} procedures</p>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-md bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Add Procedure</h3>
              <button onClick={() => setModalOpen(false)} className="rounded p-1 text-gray-400 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="block text-xs font-medium text-gray-700">
              Procedure Name *
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. ROOT CANAL - MOLAR"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <label className="mt-3 block text-xs font-medium text-gray-700">
              Default Cost (₹)
              <input
                type="number"
                min="0"
                value={newCost}
                onChange={(e) => setNewCost(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            {formError && <p className="mt-2 text-xs text-red-600">{formError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={saveNewProcedure}
                disabled={saving}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
