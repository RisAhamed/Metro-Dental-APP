'use client';

import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

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

interface Appointment {
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  appointmentDate: string;
  durationMinutes: number;
  isWalkIn: boolean;
  tokenNumber: string | null;
  abhaId: string | null;
  plannedProcedures: string | null;
  notes: string | null;
  status: string;
}

interface AppointmentModalProps {
  onClose: () => void;
  onSave: () => void;
  clinicId: string;
  doctors: Doctor[];
  appointment?: Appointment;
}

export function AppointmentModal({
  onClose,
  onSave,
  clinicId,
  doctors,
  appointment,
}: AppointmentModalProps) {
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState<'appointment' | 'reminder'>('appointment');
  const [loading, setLoading] = useState(false);
  const [searchPatient, setSearchPatient] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [form, setForm] = useState({
    patientId: appointment?.patientId || '',
    patientName: appointment?.patientName || '',
    patientPhone: '',
    patientEmail: '',
    doctorId: appointment?.doctorId || '',
    doctorName: appointment?.doctorName || '',
    categoryId: appointment?.categoryId || '',
    categoryName: appointment?.categoryName || '',
    categoryColor: appointment?.categoryColor || '',
    appointmentDate: appointment
      ? formatDateTimeInput(new Date(appointment.appointmentDate))
      : '',
    appointmentTime: appointment
      ? formatTimeInput(new Date(appointment.appointmentDate))
      : '09:00',
    durationMinutes: appointment?.durationMinutes || 30,
    isWalkIn: appointment?.isWalkIn || false,
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
  const [status, setStatus] = useState(appointment?.status || 'SCHEDULED');

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

  const handleSearchPatient = async () => {
    if (searchPatient.length < 2) return;
    try {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(searchPatient)}&limit=10`);
      const data = await res.json();
      setPatients(data.patients || []);
    } catch (error) {
      console.error('Error searching patients:', error);
    }
  };

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
  };

  const handleSubmitAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!form.patientId || !form.doctorId || !form.appointmentDate) {
      alert('Please fill in all required fields');
      setLoading(false);
      return;
    }

    const dateTime = new Date(`${form.appointmentDate}T${form.appointmentTime}`);
    const selectedDoctor = doctors.find((d) => d.id === form.doctorId);

    try {
      const payload = {
        ...form,
        appointmentDate: dateTime.toISOString(),
        doctorName: selectedDoctor?.name || form.doctorName,
        clinicId,
      };

      if (appointment) {
        // Update existing appointment
        const res = await fetch(`/api/appointments/${appointment.appointmentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, notes: form.notes }),
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
      alert('An error occurred. Please try again.');
    } finally {
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold">
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

              <div>
                <label className="block text-sm font-medium text-gray-700">Patient</label>
                <div className="mt-1 relative">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search by name, ID, or phone..."
                      value={searchPatient}
                      onChange={(e) => setSearchPatient(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                    />
                    <button
                      type="button"
                      onClick={handleSearchPatient}
                      className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </div>
                  {patients.length > 0 && (
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
                </div>
                {selectedPatient && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-md">
                    <span className="font-medium">{selectedPatient.name}</span>
                    <span className="text-sm text-gray-500 ml-2">({selectedPatient.patientId})</span>
                  </div>
                )}
              </div>

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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Doctor *</label>
                  <select
                    required
                    value={form.doctorId}
                    onChange={(e) => {
                      const doc = doctors.find((d) => d.id === e.target.value);
                      setForm({ ...form, doctorId: e.target.value, doctorName: doc?.name || '' });
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map((doc) => (
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
                  {loading ? 'Saving...' : appointment ? 'Update Appointment' : 'Save Appointment'}
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
                    const doc = doctors.find((d) => d.id === e.target.value);
                    setReminder({
                      ...reminder,
                      doctorId: e.target.value,
                      doctorName: doc?.name || '',
                    });
                  }}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">All Doctors</option>
                  {doctors.map((doc) => (
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