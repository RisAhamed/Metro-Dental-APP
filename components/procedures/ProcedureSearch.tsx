'use client';

import { useState, useEffect, useRef } from 'react';

export interface ProcedureOption {
  id: string;
  name: string;
  defaultCost: string;
}

interface ProcedureSearchProps {
  onSelect: (procedure: ProcedureOption) => void;
  placeholder?: string;
  disabled?: boolean;
  allowCustom?: boolean;
}

export function ProcedureSearch({ onSelect, placeholder, disabled, allowCustom }: ProcedureSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProcedureOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/procedures-catalog?search=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data.procedures || []);
      } catch (error) {
        console.error('Procedure search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (proc: ProcedureOption) => {
    onSelect(proc);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const handleCustom = () => {
    const name = query.trim();
    if (!name) return;
    onSelect({ id: `custom-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name, defaultCost: '0' });
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            if (!value.trim()) {
              setResults([]);
              setLoading(false);
            } else {
              setLoading(true);
            }
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder || 'Search procedure by name...'}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        {loading && <span className="self-center text-sm text-gray-400">Searching...</span>}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {results.map((proc) => (
            <button
              key={proc.id}
              type="button"
              onClick={() => handleSelect(proc)}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between gap-2"
            >
              <span className="text-sm text-gray-800">{proc.name}</span>
              <span className="text-sm font-medium text-gray-500">
                ₹{Number(proc.defaultCost || 0).toLocaleString('en-IN')}
              </span>
            </button>
          ))}
        </div>
      )}

      {open && query.trim() && !loading && results.length === 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg p-2 text-sm">
          {allowCustom ? (
            <button
              type="button"
              onClick={handleCustom}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded-md"
            >
              <span className="text-sm text-blue-700 font-medium">
                + Add &quot;{query.trim()}&quot; as new procedure
              </span>
            </button>
          ) : (
            <p className="px-3 py-2 text-gray-500">No procedures found.</p>
          )}
        </div>
      )}
    </div>
  );
}