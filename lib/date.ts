// IST (UTC+5:30) date helpers used across dashboard/reports.
export const toISTDateString = (date: Date): string => {
  return new Date(date.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
};

export const toISTStart = (date: Date): Date => {
  return new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
};

// Start of the given day in IST, as a UTC Date.
export const istDayStart = (date: Date): Date => {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - 5.5 * 60 * 60 * 1000);
};

// End of the given day in IST, as a UTC Date.
export const istDayEnd = (date: Date): Date => {
  const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
  ist.setUTCHours(23, 59, 59, 999);
  return new Date(ist.getTime() - 5.5 * 60 * 60 * 1000);
};
