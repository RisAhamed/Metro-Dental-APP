'use client';

import {
  User,
  Calendar,
  Activity,
  ClipboardList,
  FileText,
  CheckCircle2,
  FolderOpen,
  Pill,
  History,
  Receipt,
  Wallet,
  Scale,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';

export type PatientSection =
  | 'PROFILE'
  | 'APPOINTMENTS'
  | 'VITAL_SIGNS'
  | 'CLINICAL_NOTES'
  | 'VISITS'
  | 'TREATMENT_PLANS'
  | 'COMPLETED_PROCEDURES'
  | 'FILES'
  | 'PRESCRIPTIONS'
  | 'TIMELINE'
  | 'INVOICES'
  | 'PAYMENTS'
  | 'LEDGER';

const GROUPS: { label: string; items: { key: PatientSection; label: string; icon: LucideIcon }[] }[] = [
  {
    label: '',
    items: [
      { key: 'PROFILE', label: 'Profile', icon: User },
      { key: 'APPOINTMENTS', label: 'Appointments', icon: Calendar },
    ],
  },
  {
    label: 'EMR',
    items: [
      { key: 'VITAL_SIGNS', label: 'Vital Signs', icon: Activity },
      { key: 'CLINICAL_NOTES', label: 'Clinical Notes', icon: FileText },
      { key: 'VISITS', label: 'Visits (Sessions)', icon: Stethoscope },
      { key: 'TREATMENT_PLANS', label: 'Treatment Plans', icon: ClipboardList },
      { key: 'COMPLETED_PROCEDURES', label: 'Completed Procedures', icon: CheckCircle2 },
      { key: 'FILES', label: 'Files', icon: FolderOpen },
      { key: 'PRESCRIPTIONS', label: 'Prescriptions', icon: Pill },
      { key: 'TIMELINE', label: 'Timeline', icon: History },
    ],
  },
  {
    label: 'Billing',
    items: [
      { key: 'INVOICES', label: 'Invoices', icon: Receipt },
      { key: 'PAYMENTS', label: 'Payments', icon: Wallet },
      { key: 'LEDGER', label: 'Ledger', icon: Scale },
    ],
  },
];

interface PatientSidebarProps {
  patientName: string;
  patientId: string;
  genderAge: string;
  activeSection: PatientSection;
  onSectionChange: (section: PatientSection) => void;
}

export function PatientSidebar({
  patientName,
  patientId,
  genderAge,
  activeSection,
  onSectionChange,
}: PatientSidebarProps) {
  return (
    <>
      {/* Mobile: horizontal tab bar */}
      <div className="lg:hidden w-full bg-white rounded-lg shadow mb-4 overflow-hidden">
        <div className="p-3 border-b border-gray-100 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{patientName}</p>
            <p className="text-xs text-gray-500 truncate">ID: {patientId} • {genderAge}</p>
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <nav className="flex gap-1 p-2 whitespace-nowrap">
            {GROUPS.flatMap((g) => g.items).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => onSectionChange(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors flex-shrink-0 ${
                  activeSection === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="hidden xs:inline">{label}</span>
                <span className="xs:hidden">{label.split(' ')[0]}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop: vertical sidebar */}
      <div className="hidden lg:block w-56 flex-shrink-0 bg-white rounded-lg shadow h-fit sticky top-6">
        <div className="p-4 border-b border-gray-100">
          <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
            <User className="h-5 w-5" />
          </div>
          <p className="font-semibold text-gray-900 truncate">{patientName}</p>
          <p className="text-xs text-gray-500">ID: {patientId}</p>
          <p className="text-xs text-gray-400">{genderAge}</p>
        </div>

        <nav className="p-2 max-h-[calc(100vh-260px)] overflow-y-auto">
          {GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="px-3 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  {group.label}
                </p>
              )}
              {group.items.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => onSectionChange(key)}
                  title={label}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                    activeSection === key
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 flex-shrink-0 ${
                      activeSection === key ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
      </div>
    </>
  );
}
