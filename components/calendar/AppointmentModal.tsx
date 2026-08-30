'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import type { CalendarAppointment } from './types';

interface Doctor {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Patient {
  patientId: string;
  name: string;
  primaryPhone: string;
  email: string | null;
}

interface AppointmentModalProps {
  onClose: () => void;
  onSave: () => void;
  clinicId: string;
  doctors: Doctor[];
  appointment?: CalendarAppointment;
  prefill?: {
    date?: string; // yyyy-MM-dd
    time?: string; // HH:mm
    doctorId?: string;
    isWalkIn?: boolean;
    patient?: { patientId: string; name: string };
  };
}

export function AppointmentModal({
  onClose,
  onSave,
  clinicId,
  doctors,
  appointment,
  prefill,
}: AppointmentModalProps) {
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState<'appointment' | 'reminder'>('appointment');
  const [loading, setLoading] = useState(false);
  const [searchPatient, setSearchPatient] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(
    prefill?.patient
      ? {
          patientId: prefill.patient.patientId,
          name: prefill.patient.name,
          primaryPhone: '',
          email: null,
        }
      : null
  );

  const [form, setForm] = useState({
    patientId: appointment?.patientId || prefill?.patient?.patientId || '',
    patientName: appointment?.patientName || prefill?.patient?.name || '',
    patientPhone: '',
    patientEmail: '',
    doctorId: appointment?.doctorId || prefill?.doctorId || '',
    doctorName: appointment?.doctorName || '',
    categoryId: appointment?.categoryId || '',
    categoryName: appointment?.categoryName || '',
    categoryColor: appointment?.categoryColor || '',
    appointmentDate: appointment
      ? formatDateTimeInput(new Date(appointment.appointmentDate))
      : prefill?.date || '',
    appointmentTime: appointment
      ? formatTimeInput(new Date(appointment.appointmentDate))
      : prefill?.time || '09:00',
    durationMinutes: appointment?.durationMinutes || 30,
    isWalkIn: appointment?.isWalkIn || prefill?.isWalkIn || false,
    tokenNumber: appointment?.tokenNumber || '',
    abhaId: appointment?.abhaId || '',
    plannedProcedures: appointment?.plannedProcedures || '',
    notes: appointment?.notes || '',
  });

  const [reminder, setReminder] = useState({
    title: '',
    doctorId: '',
    doctorName: '',
    isAllDay: false,
    startDate: '',
    endDate: '',
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [localDoctors, setLocalDoctors] = useState<Doctor[]>([]);
  const allDoctors = doctors.length > 0 ? doctors : localDoctors;
  const [status, setStatus] = useState(appointment?.status || 'SCHEDULED');

  // New-patient toggle (only for fresh bookings, not edits)
  const [patientMode, setPatientMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [newPatient, setNewPatient] = useState({
    name: '',
    primaryPhone: '',
    gender: 'MALE',
    age: '',
    dateOfBirth: '',
    email: '',
    addressLine: '',
  });
  const [creatingPatient, setCreatingPatient] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/appointment-categories?clinicId=${clinicId}`);
        const data = await res.json();
        if (!cancelled) setCategories(data.categories || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [clinicId]);

  // Self-fetch doctors when not provided (e.g., opened from patient profile)
  useEffect(() => {
    if (doctors.length > 0) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(
          `/api/users?clinicId=${clinicId}&role=GENERAL_DOCTOR&role=CLINIC_ADMIN`
        );
        const data = await res.json();
        if (!cancelled && data.users?.length > 0) setLocalDoctors(data.users);
      } catch (error) {
        console.error('Error fetching doctors:', error);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [clinicId, doctors.length]);

  const handleSearchPatient = async (query: string) => {
    if (query.length < 2) {
      setPatients([]);
      setShowDropdown(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(query)}&limit=10`);
      const data = await res.json();
      setPatients(data.patients || []);
      setShowDropdown(true);
    } catch (error) {
      console.error('Error searching patients:', error);
    } finally {
      setSearching(false);
    }
  };

  const debouncedSearch = useCallback((query: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => handleSearchPatient(query), 300);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setForm({
      ...form,
      patientId: patient.patientId,
      patientName: patient.name,
      patientPhone: patient.primaryPhone,
      patientEmail: patient.email || '',
    });
    setSearchPatient('');
    setPatients([]);
    setShowDropdown(false);
  };

  const handleSubmitAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (patientMode === 'NEW' && !appointment) {
      if (!newPatient.name.trim() || !newPatient.primaryPhone.trim()) {
        alert('Please enter the new patient\'s name and phone number');
        setLoading(false);
        return;
      }
    }

    if (!form.doctorId || !form.appointmentDate || (patientMode === 'EXISTING' && !form.patientId)) {
      alert('Please fill in all required fields');
      setLoading(false);
      return;
    }

    const dateTime = new Date(`${form.appointmentDate}T${form.appointmentTime}`);
    const selectedDoctor = allDoctors.find((d) => d.id === form.doctorId);

    try {
      // Create the new patient on the fly, then book their appointment
      if (patientMode === 'NEW' && !appointment) {
        setCreatingPatient(true);
        const idRes = await fetch('/api/patients/generate-id');
        const idData = await idRes.json();
        if (!idRes.ok) throw new Error(idData.error || 'Failed to generate patient ID');

        const createRes = await fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId: idData.patientId,
            name: newPatient.name.trim(),
            gender: newPatient.gender,
            primaryPhone: newPatient.primaryPhone.trim(),
            age: newPatient.age ? Number(newPatient.age) : null,
            dateOfBirth: newPatient.dateOfBirth || null,
            email: newPatient.email.trim() || null,
            address: newPatient.addressLine.trim()
              ? {
                  street: newPatient.addressLine.trim(),
                  locality: '',
                  city: '',
                  pincode: '',
                }
              : null,
            registeredClinicId: clinicId,
          }),
        });
        const createData = await createRes.json();
        if (!createRes.ok) {
          throw new Error(createData.error || 'Failed to create patient');
        }

        const createdPatient = { patientId: idData.patientId as string, name: newPatient.name.trim() };
        setSelectedPatient({
          ...createdPatient,
          primaryPhone: newPatient.primaryPhone.trim(),
          email: newPatient.email.trim() || null,
        });
        setForm((f) => ({
          ...f,
          patientId: createdPatient.patientId,
          patientName: createdPatient.name,
          patientPhone: newPatient.primaryPhone,
          patientEmail: newPatient.email,
        }));
        setCreatingPatient(false);
      }

      const payload = {
        ...form,
        appointmentDate: dateTime.toISOString(),
        doctorName: selectedDoctor?.name || form.doctorName,
        clinicId,
      };

      if (appointment) {
        // Update existing appointment (full edit)
        const res = await fetch(`/api/appointments/${appointment.appointmentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status,
            patientId: form.patientId,
            patientName: form.patientName,
            doctorId: form.doctorId,
            doctorName: selectedDoctor?.name || form.doctorName,
            appointmentDate: dateTime.toISOString(),
            durationMinutes: form.durationMinutes,
            categoryId: form.categoryId || null,
            categoryName: form.categoryName || null,
            categoryColor: form.categoryColor || null,
            isWalkIn: form.isWalkIn,
            tokenNumber: form.tokenNumber || null,
            plannedProcedures: form.plannedProcedures || null,
            notes: form.notes || null,
          }),
        });
        if (res.ok) {
          onSave();
        } else {
          const error = await res.json();
          alert(error.error || 'Failed to update appointment');
        }
      } else {
        const res = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, createdBy: userId }),
        });

        if (res.ok) {
          onSave();
        } else {
          const error = await res.json();
          alert(error.error || 'Failed to create appointment');
        }
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert(
        error instanceof Error ? error.message : 'An error occurred. Please try again.'
      );
    } finally {
      setCreatingPatient(false);
      setLoading(false);
    }
  };

  const handleSubmitReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        clinicId,
        title: reminder.title,
        doctorId: reminder.doctorId || null,
        doctorName: reminder.doctorId
          ? doctors.find((d) => d.id === reminder.doctorId)?.name
          : 'All Doctors',
        isAllDay: reminder.isAllDay,
        startDate: reminder.startDate,
        endDate: reminder.endDate || reminder.startDate,
      };

      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSave();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create reminder');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-base sm:text-xl font-bold">
            {appointment ? 'Edit Appointment' : 'Book Appointment'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('appointment')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'appointment'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Appointment
          </button>
          <button
            onClick={() => setActiveTab('reminder')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'reminder'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Reminder
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'appointment' ? (
            <form onSubmit={handleSubmitAppointment} className="space-y-4">
              {appointment && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="SCHEDULED">SCHEDULED</option>
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                    <option value="NO_SHOW">NO_SHOW</option>
                  </select>
                </div>
              )}

              {/* Patient mode toggle (only for new bookings) */}
              {!appointment && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Patient</label>
                  <div className="mt-1 flex border border-gray-200 rounded-md overflow-hidden w-fit">
                    {(['EXISTING', 'NEW'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPatientMode(mode)}
                        className={`px-4 py-1.5 text-sm ${
                          patientMode === mode
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {mode === 'EXISTING' ? 'Existing Patient' : 'New Patient'}
                      </button>
                    ))}
                  </div>

                  {patientMode === 'NEW' ? (
                    <div className="mt-2 border border-blue-200 bg-blue-50/40 rounded-md p-3 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          required
                          placeholder="Full name *"
                          value={newPatient.name}
                          onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                        <input
                          required
                          placeholder="Phone *"
                          value={newPatient.primaryPhone}
                          onChange={(e) =>
                            setNewPatient({ ...newPatient, primaryPhone: e.target.value })
                          }
                          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                        <select
                          value={newPatient.gender}
                          onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                          <option value="OTHER">Other</option>
                        </select>
                        <input
                          type="number"
                          min="0"
                          placeholder="Age"
                          value={newPatient.age}
                          onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                        <input
                          type="date"
                          title="Date of birth (optional)"
                          value={newPatient.dateOfBirth}
                          onChange={(e) =>
                            setNewPatient({ ...newPatient, dateOfBirth: e.target.value })
                          }
                          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                        <input
                          type="email"
                          placeholder="Email (optional)"
                          value={newPatient.email}
                          onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                        />
                      </div>
                      <input
                        placeholder="Address (optional)"
                        value={newPatient.addressLine}
                        onChange={(e) =>
                          setNewPatient({ ...newPatient, addressLine: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      />
                      <p className="text-xs text-gray-400">
                        A patient ID will be generated automatically on save.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mt-1 relative" ref={dropdownRef}>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search by name, ID, or phone..."
                            value={searchPatient}
                            onChange={(e) => {
                              setSearchPatient(e.target.value);
                              debouncedSearch(e.target.value);
                            }}
                            onFocus={() => {
                              if (patients.length > 0) setShowDropdown(true);
                            }}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 pr-8"
                          />
                          {searching && (
                            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
                          )}
                        </div>
                        {showDropdown && patients.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                            {patients.map((p) => (
                              <button
                                key={p.patientId}
                                type="button"
                                onClick={() => handleSelectPatient(p)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                              >
                                {p.name} ({p.patientId}) - {p.primaryPhone}
                              </button>
                            ))}
                          </div>
                        )}
                        {showDropdown && !searching && patients.length === 0 && searchPatient.length >= 2 && (
                          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg px-4 py-3 text-sm text-gray-500">
                            No patients found
                          </div>
                        )}
                      </div>
                      {selectedPatient && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-md">
                          <span className="font-medium">{selectedPatient.name}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            ({selectedPatient.patientId})
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {!(patientMode === 'NEW' && !appointment) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Patient ID</label>
                    <input
                      type="text"
                      value={form.patientId}
                      readOnly
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mobile No.</label>
                    <input
                      type="text"
                      value={form.patientPhone}
                      readOnly
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Doctor *</label>
                  <select
                    required
                    value={form.doctorId}
                    onChange={(e) => {
                      const doc = allDoctors.find((d) => d.id === e.target.value);
                      setForm({ ...form, doctorId: e.target.value, doctorName: doc?.name || '' });
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select Doctor</option>
                    {allDoctors.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => {
                      const cat = categories.find((c) => c.id === e.target.value);
                      setForm({
                        ...form,
                        categoryId: e.target.value,
                        categoryName: cat?.name || '',
                        categoryColor: cat?.color || '',
                      });
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date *</label>
                  <input
                    type="date"
                    required
                    value={form.appointmentDate}
                    onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Time *</label>
                  <input
                    type="time"
                    required
                    value={form.appointmentTime}
                    onChange={(e) => setForm({ ...form, appointmentTime: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duration</label>
                  <select
                    value={form.durationMinutes}
                    onChange={(e) =>
                      setForm({ ...form, durationMinutes: parseInt(e.target.value) })
                    }
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.isWalkIn}
                      onChange={(e) => setForm({ ...form, isWalkIn: e.target.checked })}
                      className="h-4 w-4 text-blue-600"
                    />
                    Walk-in Appointment
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Token No.</label>
                  <input
                    type="text"
                    value={form.tokenNumber}
                    onChange={(e) => setForm({ ...form, tokenNumber: e.target.value })}
                    placeholder="T-001"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Planned Procedures
                </label>
                <input
                  type="text"
                  value={form.plannedProcedures}
                  onChange={(e) => setForm({ ...form, plannedProcedures: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading
                    ? creatingPatient
                      ? 'Creating patient...'
                      : 'Saving...'
                    : appointment
                    ? 'Update Appointment'
                    : 'Save Appointment'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmitReminder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title *</label>
                <input
                  type="text"
                  required
                  value={reminder.title}
                  onChange={(e) => setReminder({ ...reminder, title: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Doctor</label>
                <select
                  value={reminder.doctorId}
                  onChange={(e) => {
                    const doc = allDoctors.find((d) => d.id === e.target.value);
                    setReminder({
                      ...reminder,
                      doctorId: e.target.value,
                      doctorName: doc?.name || '',
                    });
                  }}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">All Doctors</option>
                  {allDoctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={reminder.isAllDay}
                    onChange={(e) => setReminder({ ...reminder, isAllDay: e.target.checked })}
                    className="h-4 w-4 text-blue-600"
                  />
                  All Day
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date *</label>
                  <input
                    type="datetime-local"
                    required
                    value={reminder.startDate}
                    onChange={(e) => setReminder({ ...reminder, startDate: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                  <input
                    type="datetime-local"
                    value={reminder.endDate}
                    onChange={(e) => setReminder({ ...reminder, endDate: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Reminder'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDateTimeInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeInput(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}