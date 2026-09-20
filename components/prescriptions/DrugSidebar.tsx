'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { PrescriptionMedicine } from '@/lib/db/schema/prescriptions';

interface Drug {
  id: string;
  name: string;
  defaultStrength: string | null;
  defaultStrengthUnit: string | null;
  defaultDuration: string | null;
  defaultDurationUnit: string | null;
  defaultFrequency: string | null;
}

interface Template {
  templateId: string;
  name: string;
  description: string | null;
  createdBy: string;
  medicines: PrescriptionMedicine[];
  notes: string | null;
}

interface DrugSidebarProps {
  clinicId: string;
  currentMedicines: PrescriptionMedicine[];
  currentNotes: string;
  canManageTemplates: boolean;
  userRole?: string;
  userId?: string;
  onAddDrug: (drug: Drug) => void;
  onLoadTemplate: (template: Template) => void;
}

const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

export function DrugSidebar({
  clinicId,
  currentMedicines,
  currentNotes,
  canManageTemplates,
  userRole,
  userId,
  onAddDrug,
  onLoadTemplate,
}: DrugSidebarProps) {
  const [tab, setTab] = useState<'drugs' | 'templates'>('drugs');
  const [search, setSearch] = useState('');
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [addDrugOpen, setAddDrugOpen] = useState(false);
  const [addTemplateOpen, setAddTemplateOpen] = useState(false);
  const [drugName, setDrugName] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const res = await fetch(`/api/drugs?clinicId=${encodeURIComponent(clinicId)}&search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setDrugs(data.drugs || []);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [clinicId, search]);

  useEffect(() => {
    if (tab !== 'templates') return;
    let cancelled = false;
    const load = async () => {
      const res = await fetch(`/api/prescription-templates?clinicId=${encodeURIComponent(clinicId)}`);
      if (res.ok && !cancelled) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [clinicId, tab]);

  const recent = drugs.slice(0, 10);

  const saveDrug = async () => {
    const name = drugName.trim();
    if (!name) return;
    const res = await fetch('/api/drugs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, clinicId }),
    });
    if (res.ok) {
      const data = await res.json();
      setDrugs((prev) => [data.drug, ...prev.filter((d) => d.id !== data.drug.id)]);
      setDrugName('');
      setAddDrugOpen(false);
    }
  };

  const saveTemplate = async () => {
    const name = templateName.trim();
    if (!name || currentMedicines.length === 0) return;
    const res = await fetch('/api/prescription-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description: templateDescription.trim() || null,
        clinicId,
        medicines: currentMedicines,
        notes: currentNotes.trim() || null,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setTemplates((prev) => [data.template, ...prev]);
      setTemplateName('');
      setTemplateDescription('');
      setAddTemplateOpen(false);
      setTab('templates');
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    const res = await fetch(`/api/prescription-templates/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.ok) setTemplates((prev) => prev.filter((t) => t.templateId !== id));
  };

  const canDeleteTemplate = (template: Template) =>
    userRole === 'SUPER_ADMIN' ||
    userRole === 'CLINIC_ADMIN' ||
    (userRole === 'GENERAL_DOCTOR' && template.createdBy === userId);

  return (
    <aside className="border border-gray-200 bg-white rounded-md overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
        <div className="flex rounded-md bg-gray-100 p-0.5">
          <button onClick={() => setTab('drugs')} className={`px-3 py-1 text-sm rounded ${tab === 'drugs' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>
            Drugs
          </button>
          <button onClick={() => setTab('templates')} className={`px-3 py-1 text-sm rounded ${tab === 'templates' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>
            Templates
          </button>
        </div>
        {tab === 'drugs' ? (
          <button onClick={() => setAddDrugOpen(true)} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
            <Plus className="h-4 w-4" /> Add Drug
          </button>
        ) : (
          <button onClick={() => setAddTemplateOpen(true)} disabled={!canManageTemplates} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-40">
            <Plus className="h-4 w-4" /> Add Template
          </button>
        )}
      </div>

      {tab === 'drugs' ? (
        <div>
          <div className="border-b border-gray-100 p-3">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className={inputCls} />
          </div>
          <DrugSection title="RECENT DRUGS" drugs={recent} onAddDrug={onAddDrug} />
          <DrugSection title="ALL DRUGS" drugs={drugs} onAddDrug={onAddDrug} />
        </div>
      ) : (
        <div className="max-h-[520px] overflow-y-auto">
          {templates.map((template) => (
            <div
              key={template.templateId}
              role="button"
              tabIndex={0}
              onClick={() => onLoadTemplate(template)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onLoadTemplate(template);
              }}
              className="flex w-full items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 text-left hover:bg-blue-50"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-gray-800">{template.name}</span>
                {template.description && <span className="block truncate text-xs text-gray-500">{template.description}</span>}
              </span>
              {canDeleteTemplate(template) && (
                <span className="flex items-center gap-1">
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTemplate(template.templateId);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') deleteTemplate(template.templateId);
                    }}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </span>
                </span>
              )}
            </div>
          ))}
          {templates.length === 0 && <p className="p-4 text-sm text-gray-500">No templates saved yet.</p>}
        </div>
      )}

      {addDrugOpen && (
        <Modal title="Add Drug" onClose={() => setAddDrugOpen(false)}>
          <input value={drugName} onChange={(e) => setDrugName(e.target.value)} placeholder="Drug name" className={inputCls} />
          <button onClick={saveDrug} className="mt-3 w-full rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">
            Save
          </button>
        </Modal>
      )}

      {addTemplateOpen && (
        <Modal title="Add Template" onClose={() => setAddTemplateOpen(false)}>
          <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name" className={inputCls} />
          <textarea value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} placeholder="Description" className={`${inputCls} mt-2 min-h-20 resize-y`} />
          <button onClick={saveTemplate} className="mt-3 w-full rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">
            Save
          </button>
        </Modal>
      )}
    </aside>
  );
}

function DrugSection({ title, drugs, onAddDrug }: { title: string; drugs: Drug[]; onAddDrug: (drug: Drug) => void }) {
  return (
    <div className="border-b border-gray-100">
      <h4 className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-gray-500">{title}</h4>
      <div className="max-h-64 overflow-y-auto">
        {drugs.map((drug) => (
          <div key={`${title}-${drug.id}`} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-gray-50">
            <span className="truncate text-sm text-gray-800">{drug.name}</span>
            <button onClick={() => onAddDrug(drug)} title="Add drug" className="rounded p-1 text-blue-600 hover:bg-blue-50">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-sm rounded-md bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
