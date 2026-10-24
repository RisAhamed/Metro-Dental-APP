'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Hash, Phone, Search, User } from 'lucide-react';

interface SearchResult {
  patientId: string;
  name: string;
  primaryPhone: string | null;
  practoPatientId: string | null;
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      const reset = window.setTimeout(() => {
        setResults([]);
        setIsOpen(false);
      }, 0);
      return () => window.clearTimeout(reset);
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/patients?search=${encodeURIComponent(query.trim())}&limit=8`
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.patients || []);
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Patient search failed', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  const handleSelect = (patientId: string) => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    router.push(`/patients/${patientId}/profile`);
  };

  return (
    <div className="relative w-full max-w-md" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search patients (Name, ID, Phone, Practo ID)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsOpen(false);
          }}
          className="w-full rounded-md border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isOpen && (
        <div className="absolute top-full z-50 mt-2 max-h-96 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-500">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">No patients found</div>
          ) : (
            <ul className="py-1">
              {results.map((p) => (
                <li
                  key={p.patientId}
                  onClick={() => handleSelect(p.patientId)}
                  className="flex cursor-pointer flex-col gap-1 border-b border-gray-100 px-4 py-2 last:border-0 hover:bg-blue-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-medium text-gray-900">
                      <User className="h-3 w-3 flex-shrink-0 text-gray-400" />
                      {p.name}
                    </span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                      {p.patientId}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {p.primaryPhone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {p.primaryPhone}
                      </span>
                    )}
                    {p.practoPatientId && (
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3" /> Practo: {p.practoPatientId}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
