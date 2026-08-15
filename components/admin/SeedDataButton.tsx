'use client';

import { useState } from 'react';
import { clinics } from '@/lib/constants/clinics';

export function SeedDataButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedClinic, setSelectedClinic] = useState('clinic_a');

  const handleSeed = async () => {
    if (!confirm(`Seed all default data for ${clinics.find((c) => c.clinicId === selectedClinic)?.name || selectedClinic}? This adds appointment categories, referral sources, medical conditions, patient groups, surgery types, Sunday tasks, and inventory categories.`)) {
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId: selectedClinic }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessage(
          `Seeded ${data.counts?.categories ?? 0} categories, ${data.counts?.referrals ?? 0} referrals, ${data.counts?.conditions ?? 0} conditions, ${data.counts?.groups ?? 0} groups, ${data.counts?.surgeryTypes ?? 0} surgery types, ${data.counts?.sundayTasks ?? 0} Sunday tasks, ${data.counts?.inventoryCategories ?? 0} inventory categories for ${clinics.find((c) => c.clinicId === selectedClinic)?.name || selectedClinic}.`
        );
      } else {
        const error = await res.json();
        setMessage(error.error || 'Failed to seed data');
      }
    } catch (error) {
      console.error('Seed error:', error);
      setMessage('An error occurred while seeding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900">Seed Data</h2>
      <p className="text-sm text-gray-600 mt-1">
        Insert default appointment categories, referral sources, medical conditions, patient groups,
        surgery types, Sunday tasks, and inventory categories for a clinic.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <select
          value={selectedClinic}
          onChange={(e) => setSelectedClinic(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          {clinics.map((c) => (
            <option key={c.clinicId} value={c.clinicId}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleSeed}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Seeding...' : 'Seed Data for Selected Clinic'}
        </button>
      </div>
      {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
    </div>
  );
}