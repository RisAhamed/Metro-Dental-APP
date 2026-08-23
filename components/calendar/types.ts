export interface CalendarAppointment {
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string;
  durationMinutes: number;
  categoryId?: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  status: string;
  isWalkIn: boolean;
  tokenNumber: string | null;
  abhaId?: string | null;
  plannedProcedures?: string | null;
  notes?: string | null;
}

export interface CalendarStats {
  TODAY: number;
  WAITING: number;
  ENGAGED: number;
  DONE: number;
}
