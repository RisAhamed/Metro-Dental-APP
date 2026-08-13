'use client';

import { useState } from 'react';

export function SeedDataButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSeed = async () => {
    if (!confirm('Seed all default data? This adds appointment categories, referral sources, medical conditions, and patient groups.')) {
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setMessage(
          `Seeded ${data.counts?.categories ?? 0} categories, ${data.counts?.referrals ?? 0} referrals, ${data.counts?.conditions ?? 0} conditions, ${data.counts?.groups ?? 0} groups.`
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
        Insert default appointment categories, referral sources, medical conditions, and patient
        groups.
      </p>
      <button
        onClick={handleSeed}
        disabled={loading}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Seeding...' : 'Seed All Data'}
      </button>
      {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
    </div>
  );
}