export const clinics = [
  { clinicId: 'clinic_a', name: 'Kodambakkam' },
  { clinicId: 'clinic_b', name: 'Mylapore' },
];

export const clinicName = (clinicId: string | null | undefined): string => {
  if (!clinicId) return 'All';
  return clinics.find((c) => c.clinicId === clinicId)?.name || clinicId;
};
