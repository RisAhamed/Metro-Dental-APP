'use client';

import { useState } from 'react';
import { ToothCell } from './ToothCell';

const ADULT_TEETH = {
  upper: ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'],
  lower: ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'],
};

const CHILD_TEETH = {
  upper: ['55', '54', '53', '52', '51', '61', '62', '63', '64', '65'],
  lower: ['85', '84', '83', '82', '81', '71', '72', '73', '74', '75'],
};

export type ToothMode = 'adult' | 'child';

interface DentalChartProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  initialMode?: ToothMode;
  mode?: ToothMode;
  onModeChange?: (mode: ToothMode) => void;
  showChildToggle?: boolean;
  showFullMouth?: boolean;
  disabled?: boolean;
}

export function DentalChart({
  selected,
  onChange,
  initialMode = 'adult',
  mode: controlledMode,
  onModeChange,
  showChildToggle = true,
  showFullMouth = true,
  disabled = false,
}: DentalChartProps) {
  const [internalMode, setInternalMode] = useState<ToothMode>(initialMode);
  const mode = controlledMode ?? internalMode;
  const setMode = (next: ToothMode) => {
    if (controlledMode === undefined) setInternalMode(next);
    onModeChange?.(next);
  };

  const teeth = mode === 'adult' ? ADULT_TEETH : CHILD_TEETH;
  const allTeeth = [...teeth.upper, ...teeth.lower];
  const selectedSet = new Set(selected);
  const fullMouth = allTeeth.every((t) => selectedSet.has(t));

  const toggleTooth = (tooth: string) => {
    if (disabled) return;
    const next = selectedSet.has(tooth)
      ? selected.filter((t) => t !== tooth)
      : [...selected, tooth];
    onChange(next);
  };

  const toggleFullMouth = () => {
    if (disabled) return;
    if (fullMouth) {
      // Remove all teeth of the current mode
      onChange(selected.filter((t) => !allTeeth.includes(t)));
    } else {
      // Add all teeth of the current mode (keep selections from other modes)
      const merged = new Set(selected);
      allTeeth.forEach((t) => merged.add(t));
      onChange([...merged]);
    }
  };

  const changeMode = (nextMode: ToothMode) => {
    if (disabled) return;
    setMode(nextMode);
  };

  const renderRow = (toothList: string[]) => (
    <div className="flex flex-wrap justify-center gap-1.5">
      {toothList.map((t) => (
        <ToothCell
          key={t}
          toothNumber={t}
          selected={selectedSet.has(t)}
          disabled={disabled}
          onClick={() => toggleTooth(t)}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        {showChildToggle ? (
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              disabled={disabled}
              onClick={() => changeMode('adult')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                mode === 'adult' ? 'bg-white shadow-sm font-medium' : 'text-gray-600'
              }`}
            >
              Adult
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => changeMode('child')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                mode === 'child' ? 'bg-white shadow-sm font-medium' : 'text-gray-600'
              }`}
            >
              Child
            </button>
          </div>
        ) : (
          <span className="text-sm font-medium text-gray-700">
            {mode === 'adult' ? 'Adult Teeth' : 'Child Teeth'}
          </span>
        )}

        {showFullMouth && (
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={fullMouth}
              disabled={disabled}
              onChange={toggleFullMouth}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Full Mouth
          </label>
        )}

        <span className="text-xs text-gray-500">{selected.length} selected</span>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-1.5 text-center">Upper Jaw</p>
          {renderRow(teeth.upper)}
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-1.5 text-center">Lower Jaw</p>
          {renderRow(teeth.lower)}
        </div>
      </div>
    </div>
  );
}