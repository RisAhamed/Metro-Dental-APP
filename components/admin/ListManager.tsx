'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, Pencil } from 'lucide-react';

interface ListItem {
  id: string;
  name: string;
  isActive?: boolean;
  color?: string | null;
  clinicId?: string | null;
  patientCount?: number;
}

interface ListManagerProps {
  title: string;
  description?: string;
  apiPath: string;
  recordsKey: string;
  showActive?: boolean;
  requireClinic?: boolean;
  clinicOptions?: { value: string; label: string }[];
  displayNameKey?: keyof ListItem;
}

export function ListManager({
  title,
  description,
  apiPath,
  recordsKey,
  showActive = true,
  requireClinic = false,
  clinicOptions = [],
  displayNameKey = 'name',
}: ListManagerProps) {
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [clinicId, setClinicId] = useState(clinicOptions[0]?.value || '');
  const [editing, setEditing] = useState<ListItem | null>(null);
  const [saving, setSaving] = useState(false);

  const loadItems = async () => {
    const res = await fetch(`${apiPath}?all=true`);
    const data = await res.json();
    setItems((data[recordsKey] as ListItem[]) || []);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiPath}?all=true`);
        const data = await res.json();
        if (!cancelled) setItems((data[recordsKey] as ListItem[]) || []);
      } catch (error) {
        console.error(`Error loading ${title}:`, error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [apiPath, recordsKey, title]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, string> = { name: name.trim() };
      if (requireClinic && clinicId) body.clinicId = clinicId;

      if (editing) {
        const res = await fetch(apiPath, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, name: name.trim() }),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || 'Failed to update item');
          return;
        }
      } else {
        const res = await fetch(apiPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || 'Failed to add item');
          return;
        }
      }

      setName('');
      setEditing(null);
      await loadItems();
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: ListItem) => {
    const res = await fetch(apiPath, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
    });
    if (res.ok) await loadItems();
  };

  const handleDelete = async (item: ListItem) => {
    if (!confirm(`Delete "${item.name}"? This will deactivate it.`)) return;
    const res = await fetch(`${apiPath}?id=${item.id}`, { method: 'DELETE' });
    if (res.ok) await loadItems();
  };

  const inputClass =
    'flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
        </div>
        <button
          onClick={loadItems}
          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
          }}
          placeholder={`New ${title.toLowerCase().replace(/s$/, '')} name`}
          className={inputClass}
        />
        {requireClinic && (
          <select
            value={clinicId}
            onChange={(e) => setClinicId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          >
            {clinicOptions.map((clinic) => (
              <option key={clinic.value} value={clinic.value}>
                {clinic.label}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          {editing ? 'Update' : 'Add'}
        </button>
        {editing && (
          <button
            onClick={() => {
              setEditing(null);
              setName('');
            }}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
        )}
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No items yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100">
          {items.map((item) => (
            <li key={item.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {item.color && (
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item[displayNameKey]}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.id}
                    {item.patientCount !== undefined && ` • ${item.patientCount} patients`}
                    {item.clinicId && ` • ${item.clinicId}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {showActive && (
                  <button
                    onClick={() => handleToggle(item)}
                    className={`px-2 py-1 text-xs rounded-full ${
                      item.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {item.isActive ? 'Active' : 'Inactive'}
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditing(item);
                    setName(item.name);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label={`Edit ${item.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="text-red-500 hover:text-red-700"
                  aria-label={`Delete ${item.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
