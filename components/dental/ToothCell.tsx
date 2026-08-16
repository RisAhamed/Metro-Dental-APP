'use client';

interface ToothCellProps {
  toothNumber: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function ToothCell({ toothNumber, selected, disabled, onClick }: ToothCellProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-9 h-9 rounded-md border text-xs font-medium transition-colors flex items-center justify-center select-none ${
        disabled
          ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
          : selected
            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
      }`}
    >
      {toothNumber}
    </button>
  );
}