'use client';

import { Check, Minus } from 'lucide-react';

interface AdminCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  accentColor?: string;
  ariaLabel?: string;
}

export default function AdminCheckbox({
  checked,
  indeterminate = false,
  onChange,
  accentColor = '#5eead4',
  ariaLabel,
}: AdminCheckboxProps) {
  const active = checked || indeterminate;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className="flex items-center justify-center w-[18px] h-[18px] rounded-[6px] border transition-colors duration-200 shrink-0"
      style={{
        borderColor: active ? accentColor : 'rgba(255,255,255,0.25)',
        backgroundColor: active ? accentColor : 'transparent',
      }}
    >
      {checked && !indeterminate && <Check size={13} strokeWidth={3} className="text-slate-950" />}
      {indeterminate && <Minus size={13} strokeWidth={3} className="text-slate-950" />}
    </button>
  );
}
