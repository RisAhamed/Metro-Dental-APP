'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, X, Trash2, RefreshCw } from 'lucide-react';

interface SundayTask {
  id: string;
  name: string;
  amount: string;
  isActive: boolean;
  description: string | null;
}

interface TaskForm {
  name: string;
  amount: string;
  description: string;
}

const EMPTY_FORM: TaskForm = { name: '', amount: '250', description: '' };

export function SundayTasksAdmin() {
  const [items, setItems] = useState<SundayTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SundayTask | null>(null);
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/sunday-tasks?includeInactive=true');
        const data = await res.json();
        if (!cancelled) setItems(data.records || []);
      } catch (error) {
        console.error('Error loading Sunday tasks:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadItems = async () => {
    const res = await fetch('/api/sunday-tasks?includeInactive=true');
    const data = await res.json();
    setItems(data.records || []);
  };

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (item: SundayTask) => {
    setEditing(item);
    setForm({
      name: item.name,
      amount: item.amount,
      description: item.description || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('Task name is required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const res = await fetch(`/api/sunday-tasks/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            amount: Number(form.amount) || 250,
            description: form.description.trim(),
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || 'Failed to update task');
        }
      } else {
        const res = await fetch('/api/sunday-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            amount: Number(form.amount) || 250,
            description: form.description.trim(),
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || 'Failed to add task');
        }
      }
      setShowModal(false);
      await loadItems();
    } catch (error) {
      console.error('Error saving Sunday task:', error);
      alert('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: SundayTask) => {
    const res = await fetch(`/api/sunday-tasks/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !item.isActive }),
    });
    if (res.ok) await loadItems();
  };

  const handleDelete = async (item: SundayTask) => {
    if (
      !confirm(
        `Deactivate "${item.name}"? It will be hidden from assistants but kept in records.`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/sunday-tasks/${item.id}`, { method: 'DELETE' });
    if (res.ok) await loadItems();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sunday Tasks Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tasks assistants complete on Sundays for a fixed incentive each.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          Add New Task
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          <p>No Sunday tasks yet. Click &quot;Add New Task&quot; to create one.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Task Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.name}
                    {item.description && (
                      <p className="text-xs text-gray-500 font-normal mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    &#8377;{Number(item.amount).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
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
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => openEdit(item)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4 inline" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="text-red-500 hover:text-red-700"
                      title="Deactivate"
                    >
                      <Trash2 className="h-4 w-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={loadItems}
        className="mt-4 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
      >
        <RefreshCw className="h-3 w-3" />
        Refresh
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editing ? 'Edit Sunday Task' : 'Add New Sunday Task'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Cleaning"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (&#8377;)
                </label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="250"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional description"
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}