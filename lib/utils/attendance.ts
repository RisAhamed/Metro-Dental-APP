export function toISTDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function toISTTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function toISTMinutes(date: Date): number {
  const [h, m] = toISTTime(date).split(':').map(Number);
  return h * 60 + m;
}

// Compute hours worked between two IST timestamps
export function hoursBetweenIST(clockIn: Date, clockOut: Date): number {
  const inMin = toISTMinutes(clockIn);
  const outMin = toISTMinutes(clockOut);
  let diff = outMin - inMin;
  // Handle crossing midnight
  if (diff < 0) diff += 24 * 60;
  return Math.round((diff / 60) * 100) / 100;
}

export function formatISTDate(date: Date | string | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}
