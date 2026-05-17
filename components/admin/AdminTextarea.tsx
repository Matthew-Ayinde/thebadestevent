'use client';

import React from 'react';

interface AdminTextareaProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  rows?: number;
  maxLength?: number;
  charCount?: number;
}

const AdminTextarea = React.forwardRef<HTMLTextAreaElement, AdminTextareaProps>(
  (
    {
      label,
      placeholder,
      value,
      onChange,
      error,
      required = false,
      disabled = false,
      name,
      id,
      rows = 4,
      maxLength,
      charCount = 0,
    },
    ref
  ) => {
    const textareaId = id || name;

    return (
      <div className="w-full">
        {label && (
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor={textareaId}
              className="block text-xs uppercase tracking-[0.26em] text-white/50 font-medium"
            >
              {label}
              {required && <span className="text-red-400 ml-1">*</span>}
            </label>
            {maxLength && (
              <span
                className={`text-xs tabular-nums transition-colors duration-200 ${
                  charCount >= maxLength
                    ? 'text-red-400'
                    : charCount >= maxLength * 0.8
                    ? 'text-amber-400'
                    : 'text-white/30'
                }`}
              >
                {charCount}/{maxLength}
              </span>
            )}
          </div>
        )}
        <textarea
          id={textareaId}
          name={name}
          ref={ref}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          className={`w-full border border-white/10 rounded-lg bg-[#041114]/60 px-4 py-2 text-white/90 placeholder-white/30 transition duration-300 focus:border-teal-300/50 focus:bg-[#07171a] focus:outline-none focus:shadow-[0_0_0_4px_rgba(125,211,207,0.08)] disabled:opacity-50 disabled:cursor-not-allowed resize-none ${
            error ? 'border-red-400/50' : ''
          }`}
        />
        {error && <p className="text-xs text-red-400/90 mt-1">{error}</p>}
      </div>
    );
  }
);

AdminTextarea.displayName = 'AdminTextarea';

export default AdminTextarea;