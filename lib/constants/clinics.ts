export const clinics = [
  { clinicId: 'clinic_a', name: 'Clinic A' },
  { clinicId: 'clinic_b', name: 'Clinic B' },
];

export const clinicName = (clinicId: string | null | undefined): string => {
  if (!clinicId) return 'All';
  return clinics.find((c) => c.clinicId === clinicId)?.name || clinicId;
};
