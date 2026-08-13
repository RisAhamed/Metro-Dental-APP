export function toISTDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function toISTTimeString(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(':', '');
}

export function slotKey(doctorId: string, date: Date): string {
  const dateStr = toISTDateString(date).replace(/-/g, '');
  const timeStr = toISTTimeString(date);
  return `${doctorId}_${dateStr}_${timeStr}`;
}