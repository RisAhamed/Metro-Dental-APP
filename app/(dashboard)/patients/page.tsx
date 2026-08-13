'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import {
  Search,
  Plus,
  Users,
  Phone,
  Calendar,
  Tag,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';

interface Patient {
  patientId: string;
  name: string;
  gender: string;
  primaryPhone: string;
  groups: string[];
  lastVisitDate: string | null;
}

interface Group {
  id: string;
  name: string;
  patientCount: number;
}

export default function PatientsPage() {
  const { sessionClaims } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupForm, setGroupForm] = useState({ id: '', name: '' });
  const [groupAction, setGroupAction] = useState<'create' | 'rename'>('create');

  const clinicId = (sessionClaims?.primaryClinicId as string) || 'clinic_a';

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const params = new URLSearchParams({ clinicId, limit: '50' });
        if (selectedGroup) params.set('group', selectedGroup);
        if (appliedSearch) params.set('search', appliedSearch);

        const res = await fetch(`/api/patients?${params.toString()}`);
        const data = await res.json();
        if (!cancelled) {
          setPatients(data.patients || []);
          setTotal(data.total || 0);
        }
      } catch (error) {
        console.error('Error fetching patients:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [clinicId, selectedGroup, appliedSearch]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/patient-groups?clinicId=${clinicId}`);
        const data = await res.json();
        if (!cancelled) setGroups(data.groups || []);
      } catch (error) {
        console.error('Error fetching groups:', error);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [clinicId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchQuery);
    setLoading(true);
  };

  const selectGroup = (id: string | null) => {
    setSelectedGroup(id);
    setLoading(true);
  };

  const reloadGroups = async () => {
    try {
      const res = await fetch(`/api/patient-groups?clinicId=${clinicId}`);
      const data = await res.json();
      setGroups(data.groups || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const createGroup = async () => {
    if (!groupForm.name.trim()) return;
    const res = await fetch('/api/patient-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: groupForm.name, clinicId }),
    });
    if (res.ok) {
      setGroupForm({ id: '', name: '' });
      setGroupAction('create');
      setShowGroupModal(false);
      reloadGroups();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to create group');
    }
  };

  const renameGroup = async () => {
    if (!groupForm.id || !groupForm.name.trim()) return;
    const res = await fetch('/api/patient-groups', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: groupForm.id, name: groupForm.name }),
    });
    if (res.ok) {
      setGroupForm({ id: '', name: '' });
      setGroupAction('create');
      setShowGroupModal(false);
      reloadGroups();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to rename group');
    }
  };

  const deleteGroup = async (id: string) => {
    if (!confirm('Delete this group? Patients will not be affected.')) return;
    const res = await fetch(`/api/patient-groups?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      if (selectedGroup === id) selectGroup(null);
      reloadGroups();
    } else {
      alert('Failed to delete group');
    }
  };

  const startRename = (group: Group) => {
    setGroupForm({ id: group.id, name: group.name });
    setGroupAction('rename');
    setShowGroupModal(true);
  };

  const groupNamesById = groups.reduce<Record<string, string>>((acc, g) => {
    acc[g.id] = g.name;
    return acc;
  }, {});

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="flex h-full gap-6">
      {/* Groups Sidebar */}
      <div className="w-64 flex-shrink-0 bg-white rounded-lg shadow p-4 h-[calc(100vh-120px)] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-700">Groups</h3>
          <button
            onClick={() => {
              setGroupForm({ id: '', name: '' });
              setGroupAction('create');
              setShowGroupModal(true);
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            Manage
          </button>
        </div>

        <div className="space-y-1">
          <button
            onClick={() => selectGroup(null)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              !selectedGroup ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'
            }`}
          >
            All Patients
            <span className="float-right text-gray-500">{total}</span>
          </button>

          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => selectGroup(group.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedGroup === group.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {group.name}
              </span>
              <span className="float-right text-gray-500">{group.patientCount}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 space-y-4 min-w-0">
        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow p-4">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by name, patient ID, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Search
            </button>
            <Link
              href="/patients/new"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> New Patient
            </Link>
          </form>
        </div>

        {/* Patient Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              Loading patients...
            </div>
          ) : patients.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-2" />
              <p>No patients found</p>
              <Link href="/patients/new" className="text-blue-600 hover:underline">
                Register a new patient
              </Link>
            </div>
          ) : (
            patients.map((patient) => (
              <Link
                key={patient.patientId}
                href={`/patients/${patient.patientId}/profile`}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 block"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                    <p className="text-sm text-gray-500">{patient.patientId}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      patient.gender === 'MALE'
                        ? 'bg-blue-100 text-blue-800'
                        : patient.gender === 'FEMALE'
                          ? 'bg-pink-100 text-pink-800'
                          : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {patient.gender}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  {patient.primaryPhone}
                </div>
                {patient.lastVisitDate && (
                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    Last visit: {formatDate(patient.lastVisitDate)}
                  </div>
                )}
                {patient.groups && patient.groups.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {patient.groups.slice(0, 2).map((g) => (
                      <span
                        key={g}
                        className="px-2 py-0.5 bg-gray-100 text-xs rounded text-gray-600"
                      >
                        {groupNamesById[g] || g}
                      </span>
                    ))}
                    {patient.groups.length > 2 && (
                      <span className="text-xs text-gray-400">
                        +{patient.groups.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Group Management Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Manage Groups</h2>
              <button
                onClick={() => setShowGroupModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Create / Rename form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (groupAction === 'create') {
                  createGroup();
                } else {
                  renameGroup();
                }
              }}
              className="mb-4"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Group name (e.g. Wisdom Tooth Extraction)"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 whitespace-nowrap"
                >
                  {groupAction === 'create' ? 'Add' : 'Rename'}
                </button>
              </div>
            </form>

            {/* Existing groups */}
            <div className="flex-1 overflow-y-auto space-y-1">
              {groups.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  No groups yet. Create one above.
                </p>
              ) : (
                groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{group.name}</p>
                      <p className="text-xs text-gray-500">{group.patientCount} patients</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startRename(group)}
                        className="p-1.5 rounded-md text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                        title="Rename"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteGroup(group.id)}
                        className="p-1.5 rounded-md text-gray-500 hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
