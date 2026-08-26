'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Trash2 } from 'lucide-react';

interface Lab {
  labId: string;
  name: string;
  address: string | null;
}

interface PatientResult {
  patientId: string;
  name: string;
  primaryPhone: string;
}

interface StageForm {
  stageName: string;
  description: string;
  deadline: string;
  price: string;
  templateId?: string | null;
}

interface WorkType {
  id: string;
  name: string;
}

interface Shade {
  id: string;
  name: string;
  hexColor: string | null;
}

interface StageTemplate {
  id: string;
  name: string;
  description: string | null;
}

interface LabOrderFormProps {
  mode: 'create' | 'edit';
  clinicId: string;
  initialData?: {
    orderId?: string;
    labId: string;
    patientId?: string;
    patientName?: string;
    visitId?: string | null;
    workDescription: string;
    overallDueDate?: string | null;
    stages: StageForm[];
    workType?: string | null;
    workTypeId?: string | null;
    shade?: string | null;
    shadeId?: string | null;
    totalAmount?: string | null;
  };
  onSuccess?: (orderId: string) => void;
}

export function LabOrderForm({ mode, clinicId, initialData, onSuccess }: LabOrderFormProps) {
  const router = useRouter();
  const [labs, setLabs] = useState<Lab[]>([]);
  const [shades, setShades] = useState<Shade[]>([]);
  const [allWorkTypes, setAllWorkTypes] = useState<WorkType[]>([]);
  const [allStageTemplates, setAllStageTemplates] = useState<StageTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchPatient, setSearchPatient] = useState('');
  const [patients, setPatients] = useState<PatientResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(() => {
    if (initialData?.patientId && initialData?.patientName) {
      return {
        patientId: initialData.patientId,
        name: initialData.patientName,
        primaryPhone: '',
      };
    }
    return null;
  });

  const [form, setForm] = useState({
    labId: initialData?.labId || '',
    visitId: initialData?.visitId || '',
    workDescription: initialData?.workDescription || '',
    overallDueDate: initialData?.overallDueDate ? initialData.overallDueDate.slice(0, 10) : '',
    workType: initialData?.workType || '',
    workTypeId: initialData?.workTypeId || '',
    shade: initialData?.shade || '',
    shadeId: initialData?.shadeId || '',
    stages: initialData?.stages?.length
      ? initialData.stages
      : [{ stageName: '', description: '', deadline: '', price: '' }],
  });

  // Work type search
  const [workTypeQuery, setWorkTypeQuery] = useState(initialData?.workType || '');
  const [workTypeResults, setWorkTypeResults] = useState<WorkType[]>([]);
  const [showWorkTypeDropdown, setShowWorkTypeDropdown] = useState(false);

  // Shade search
  const [shadeQuery, setShadeQuery] = useState(initialData?.shade || '');
  const [showShadeDropdown, setShowShadeDropdown] = useState(false);

  // Stage template search per row
  const [stageTemplateResults, setStageTemplateResults] = useState<Record<number, StageTemplate[]>>({});
  const [activeStageSearch, setActiveStageSearch] = useState<number | null>(null);

  const totalAmount = useMemo(() => {
    return form.stages.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
  }, [form.stages]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [labsRes, shadesRes, wtRes, tplRes] = await Promise.all([
          fetch('/api/labs?active=true'),
          fetch('/api/lab-shades'),
          fetch('/api/lab-work-types'),
          fetch('/api/lab-stage-templates'),
        ]);
        const labsData = await labsRes.json();
        const shadesData = await shadesRes.json();
        const wtData = await wtRes.json();
        const tplData = await tplRes.json();
        if (!cancelled) {
          setLabs(labsData.labs || []);
          setShades(shadesData.shades || []);
          setAllWorkTypes(wtData.workTypes || []);
          setAllStageTemplates(tplData.templates || []);
        }
      } catch (error) {
        console.error('Error fetching form data:', error);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Work type search - real-time local filtering with debounce (like Shade)
  useEffect(() => {
    if (!workTypeQuery.trim()) {
      setWorkTypeResults([]);
      return;
    }
    const t = setTimeout(() => {
      const q = workTypeQuery.trim().toLowerCase();
      const filtered = allWorkTypes.filter((wt) => wt.name.toLowerCase().includes(q));
      setWorkTypeResults(filtered);
    }, 300);
    return () => clearTimeout(t);
  }, [workTypeQuery, allWorkTypes]);

  const handleSelectWorkType = (wt: WorkType) => {
    setForm((f) => ({ ...f, workType: wt.name, workTypeId: wt.id }));
    setWorkTypeQuery(wt.name);
    setShowWorkTypeDropdown(false);
  };

  const handleAddNewWorkType = async () => {
    const name = workTypeQuery.trim();
    if (!name) return;
    try {
      const res = await fetch('/api/lab-work-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok) {
        const newWt = data.workType;
        setAllWorkTypes((prev) => [...prev, newWt]);
        handleSelectWorkType(newWt);
      } else {
        alert(data.error || 'Failed to add work type');
      }
    } catch (error) {
      console.error('Error adding work type:', error);
      alert('Failed to add work type');
    }
  };

  const handleSelectShade = (shade: Shade) => {
    setForm((f) => ({ ...f, shade: shade.name, shadeId: shade.id }));
    setShadeQuery(shade.name);
    setShowShadeDropdown(false);
  };

  const handleAddNewShade = async () => {
    const name = shadeQuery.trim();
    if (!name) return;
    try {
      const res = await fetch('/api/lab-shades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok) {
        const newShade = data.shade;
        setShades((prev) => [...prev, newShade]);
        handleSelectShade(newShade);
      } else {
        alert(data.error || 'Failed to add shade');
      }
    } catch (error) {
      console.error('Error adding shade:', error);
      alert('Failed to add shade');
    }
  };

  const handleSearchPatient = async () => {
    if (searchPatient.length < 2) return;
    try {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(searchPatient)}&limit=10`);
      const data = await res.json();
      setPatients(data.patients || []);
    } catch (error) {
      console.error('Error searching patients:', error);
    }
  };

  useEffect(() => {
    if (searchPatient.length < 2) return;
    const t = setTimeout(() => {
      const search = async () => {
        try {
          const res = await fetch(`/api/patients?search=${encodeURIComponent(searchPatient)}&limit=10`);
          const data = await res.json();
          setPatients(data.patients || []);
        } catch (error) {
          console.error('Error searching patients:', error);
        }
      };
      search();
    }, 300);
    return () => clearTimeout(t);
  }, [searchPatient]);

  const handleSelectPatient = (patient: PatientResult) => {
    setSelectedPatient(patient);
    setSearchPatient('');
    setPatients([]);
  };

  const updateStage = (index: number, field: keyof StageForm, value: string) => {
    setForm((f) => ({
      ...f,
      stages: f.stages.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    }));
  };

  const handleStageNameChange = (index: number, value: string) => {
    updateStage(index, 'stageName', value);
    setActiveStageSearch(index);
    if (value.trim().length < 2) {
      setStageTemplateResults((prev) => ({ ...prev, [index]: [] }));
      return;
    }
    // Debounced local filtering (mirrors Shade/workType behavior)
    setTimeout(() => {
      const q = value.trim().toLowerCase();
      const filtered = allStageTemplates.filter(
        (tpl) => tpl.name.toLowerCase().includes(q) || (tpl.description && tpl.description.toLowerCase().includes(q))
      );
      setStageTemplateResults((prev) => ({ ...prev, [index]: filtered.slice(0, 10) }));
    }, 300);
  };

  const handleSelectStageTemplate = (index: number, tpl: StageTemplate) => {
    setForm((f) => ({
      ...f,
      stages: f.stages.map((s, i) =>
        i === index
          ? { ...s, stageName: tpl.name, description: tpl.description || s.description, templateId: tpl.id }
          : s
      ),
    }));
    setStageTemplateResults((prev) => ({ ...prev, [index]: [] }));
    setActiveStageSearch(null);
  };

  const handleAddStageAsTemplate = async (index: number) => {
    const stage = form.stages[index];
    const name = stage.stageName.trim();
    if (!name) return;
    try {
      const res = await fetch('/api/lab-stage-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: stage.description }),
      });
      const data = await res.json();
      if (res.ok) {
        setAllStageTemplates((prev) => [...prev, data.template]);
        updateStage(index, 'templateId' as keyof StageForm, data.template.id);
        alert(`Template "${name}" added for future orders`);
        setStageTemplateResults((prev) => ({ ...prev, [index]: [] }));
      } else {
        alert(data.error || 'Failed to add template');
      }
    } catch (error) {
      console.error('Error adding template:', error);
      alert('Failed to add template');
    }
  };

  const addStage = () => {
    setForm((f) => ({
      ...f,
      stages: [...f.stages, { stageName: '', description: '', deadline: '', price: '' }],
    }));
  };

  const removeStage = (index: number) => {
    setForm((f) => ({
      ...f,
      stages: f.stages.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const selectedLab = labs.find((l) => l.labId === form.labId);

    const patientId = selectedPatient?.patientId || initialData?.patientId;
    const patientName = selectedPatient?.name || initialData?.patientName || '';

    if (!patientId || !form.labId || !form.workDescription) {
      alert('Please select a patient, lab, and enter work description');
      setLoading(false);
      return;
    }

    const validStages = form.stages
      .filter((s) => s.stageName.trim())
      .map((s) => ({
        stageName: s.stageName.trim(),
        description: s.description?.trim() || '',
        deadline: s.deadline || null,
        price: s.price ? String(Number(s.price)) : null,
        templateId: (s as unknown as { templateId?: string }).templateId || null,
      }));

    if (validStages.length === 0) {
      alert('Please add at least one stage');
      setLoading(false);
      return;
    }

    const computedTotal = validStages.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

    try {
      if (mode === 'edit' && initialData?.orderId) {
        const res = await fetch(`/api/lab-orders/${initialData.orderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            labId: form.labId,
            labName: selectedLab?.name || '',
            workDescription: form.workDescription,
            overallDueDate: form.overallDueDate || null,
            visitId: form.visitId || null,
            stages: validStages,
            workType: form.workType || null,
            workTypeId: form.workTypeId || null,
            shade: form.shade || null,
            shadeId: form.shadeId || null,
            totalAmount: computedTotal ? String(computedTotal) : null,
          }),
        });

        if (res.ok) {
          if (onSuccess) onSuccess(initialData.orderId);
          else router.push(`/lab-orders/${initialData.orderId}`);
        } else {
          const error = await res.json();
          alert(error.error || 'Failed to update lab order');
        }
      } else {
        const payload = {
          labId: form.labId,
          labName: selectedLab?.name || '',
          clinicId,
          patientId,
          patientName,
          visitId: form.visitId || null,
          workDescription: form.workDescription,
          overallDueDate: form.overallDueDate || null,
          stages: validStages,
          workType: form.workType || null,
          workTypeId: form.workTypeId || null,
          shade: form.shade || null,
          shadeId: form.shadeId || null,
          totalAmount: computedTotal ? String(computedTotal) : null,
        };

        const res = await fetch('/api/lab-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          if (onSuccess) onSuccess(data.orderId);
          else router.push(`/lab-orders/${data.orderId}`);
        } else {
          const error = await res.json();
          alert(error.error || 'Failed to create lab order');
        }
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isEdit = mode === 'edit';
  const filteredShades = shades.filter((s) =>
    shadeQuery ? s.name.toLowerCase().includes(shadeQuery.toLowerCase()) : true
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow p-6">
      {/* Patient selection - only editable in create mode */}
      {!isEdit ? (
        <div>
          <label className="block text-sm font-medium text-gray-700">Patient *</label>
          <div className="mt-1 relative">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search by name, ID, or phone..."
                value={searchPatient}
                onChange={(e) => setSearchPatient(e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2"
              />
              <button
                type="button"
                onClick={handleSearchPatient}
                className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
            {patients.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                {patients.map((p) => (
                  <button
                    key={p.patientId}
                    type="button"
                    onClick={() => handleSelectPatient(p)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                  >
                    {p.name} ({p.patientId}) - {p.primaryPhone}
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedPatient && (
            <div className="mt-2 p-2 bg-blue-50 rounded-md">
              <span className="font-medium">{selectedPatient.name}</span>
              <span className="text-sm text-gray-500 ml-2">({selectedPatient.patientId})</span>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-blue-50 rounded-md p-3">
          <p className="text-sm text-gray-600">
            Patient: <span className="font-medium text-gray-900">{initialData?.patientName}</span> (
            {initialData?.patientId})
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Lab *</label>
          <select
            required
            value={form.labId}
            onChange={(e) => setForm({ ...form, labId: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="">Select Lab</option>
            {labs.map((lab) => (
              <option key={lab.labId} value={lab.labId}>
                {lab.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Overall Due Date</label>
          <input
            type="date"
            value={form.overallDueDate}
            onChange={(e) => setForm({ ...form, overallDueDate: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700">Work Type</label>
          <input
            type="text"
            placeholder="Search work type..."
            value={workTypeQuery}
            onChange={(e) => {
              setWorkTypeQuery(e.target.value);
              setShowWorkTypeDropdown(true);
              if (!e.target.value.trim()) {
                setForm((f) => ({ ...f, workType: '', workTypeId: '' }));
              }
            }}
            onFocus={() => setShowWorkTypeDropdown(true)}
            onBlur={() => setTimeout(() => setShowWorkTypeDropdown(false), 200)}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          />
          {showWorkTypeDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
              {(workTypeQuery.trim() ? workTypeResults : allWorkTypes.slice(0, 20)).map((wt) => (
                <button
                  key={wt.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectWorkType(wt);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                >
                  {wt.name}
                </button>
              ))}
              {workTypeQuery.trim() &&
                !(workTypeQuery.trim() ? workTypeResults : allWorkTypes.slice(0, 20)).some(
                  (wt) => wt.name.toLowerCase() === workTypeQuery.trim().toLowerCase()
                ) && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleAddNewWorkType();
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-blue-600 border-t border-gray-100"
                  >
                    + Add &quot;{workTypeQuery.trim()}&quot; as new work type
                  </button>
                )}
              {(workTypeQuery.trim() ? workTypeResults : allWorkTypes.slice(0, 20)).length === 0 && !workTypeQuery.trim() && (
                <p className="px-4 py-2 text-sm text-gray-400">No work types available</p>
              )}
            </div>
          )}
          {form.workType && (
            <p className="text-xs text-gray-500 mt-1">Selected: {form.workType}</p>
          )}
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-gray-700">Shade</label>
          <div className="mt-1 relative">
            <input
              type="text"
              placeholder="Search shade..."
              value={shadeQuery}
              onChange={(e) => {
                setShadeQuery(e.target.value);
                setShowShadeDropdown(true);
                if (!e.target.value.trim()) {
                  setForm((f) => ({ ...f, shade: '', shadeId: '' }));
                }
              }}
              onFocus={() => setShowShadeDropdown(true)}
              onBlur={() => setTimeout(() => setShowShadeDropdown(false), 200)}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 pr-10"
            />
            {form.shadeId && shades.find((s) => s.id === form.shadeId)?.hexColor && (
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border border-gray-300"
                style={{ backgroundColor: shades.find((s) => s.id === form.shadeId)?.hexColor || '#fff' }}
              />
            )}
          </div>
          {showShadeDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
              {filteredShades.slice(0, 20).map((sh) => (
                <button
                  key={sh.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectShade(sh);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex items-center gap-2"
                >
                  {sh.hexColor && (
                    <span
                      className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: sh.hexColor }}
                    />
                  )}
                  {sh.name}
                </button>
              ))}
              {shadeQuery.trim() && !filteredShades.some((s) => s.name.toLowerCase() === shadeQuery.toLowerCase()) && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleAddNewShade();
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-blue-600"
                >
                  + Add &quot;{shadeQuery}&quot; as new shade
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Visit ID</label>
        <input
          type="text"
          value={form.visitId}
          onChange={(e) => setForm({ ...form, visitId: e.target.value })}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Work Description *</label>
        <textarea
          required
          value={form.workDescription}
          onChange={(e) => setForm({ ...form, workDescription: e.target.value })}
          rows={3}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          placeholder="Describe the lab work required..."
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Stages</label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              Total: ₹{totalAmount.toLocaleString('en-IN')}
            </span>
            <button
              type="button"
              onClick={addStage}
              className="px-3 py-1.5 text-sm bg-gray-100 rounded-md hover:bg-gray-200 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Add Stage
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {form.stages.map((stage, index) => (
            <div key={index} className="border border-gray-200 rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Stage {index + 1}</span>
                {form.stages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStage(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Stage name *"
                  required={index === 0}
                  value={stage.stageName}
                  onChange={(e) => handleStageNameChange(index, e.target.value)}
                  onFocus={() => setActiveStageSearch(index)}
                  onBlur={() => setTimeout(() => setActiveStageSearch(null), 200)}
                  className="border border-gray-300 rounded-md px-3 py-2 w-full"
                />
                {activeStageSearch === index && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {(stage.stageName.trim()
                      ? stageTemplateResults[index] || []
                      : allStageTemplates.slice(0, 10)
                    ).map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectStageTemplate(index, tpl);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                      >
                        <div className="font-medium">{tpl.name}</div>
                        {tpl.description && (
                          <div className="text-xs text-gray-500">{tpl.description}</div>
                        )}
                      </button>
                    ))}
                    {stage.stageName.trim() &&
                      !(stage.stageName.trim()
                        ? stageTemplateResults[index] || []
                        : allStageTemplates.slice(0, 10)
                      ).some((t) => t.name.toLowerCase() === stage.stageName.trim().toLowerCase()) && (
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleAddStageAsTemplate(index);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm text-blue-600 border-t border-gray-100"
                        >
                          + Add &quot;{stage.stageName.trim()}&quot; as new template
                        </button>
                      )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  placeholder="Deadline"
                  value={stage.deadline}
                  onChange={(e) => updateStage(index, 'deadline', e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2"
                />
                <input
                  type="number"
                  placeholder="Price (₹)"
                  min="0"
                  step="0.01"
                  value={stage.price}
                  onChange={(e) => updateStage(index, 'price', e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <input
                type="text"
                placeholder="Description"
                value={stage.description}
                onChange={(e) => updateStage(index, 'description', e.target.value)}
                className="block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? (isEdit ? 'Updating...' : 'Creating...') : isEdit ? 'Update Lab Order' : 'Create Lab Order'}
        </button>
      </div>
    </form>
  );
}
