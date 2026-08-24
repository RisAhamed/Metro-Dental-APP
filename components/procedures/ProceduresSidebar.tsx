'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import type { ProcedureOption } from './ProcedureSearch';

interface ProceduresSidebarProps {
  onSelect: (procedure: ProcedureOption) => void;
}

export function ProceduresSidebar({ onSelect }: ProceduresSidebarProps) {
  const [procedures, setProcedures] = useState<ProcedureOption[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/procedures-catalog?limit=100');
        const data = await res.json();
        if (!cancelled) {
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
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return procedures;
    return procedures.filter((p) => p.name.toLowerCase().includes(q));
  }, [procedures, query]);

  return (
    <div className="w-[300px] flex-shrink-0 bg-white rounded-lg shadow flex flex-col h-[600px] sticky top-6">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Procedures Catalog</h3>
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
    </div>
  );
}
