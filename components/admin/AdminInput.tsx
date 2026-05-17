'use client';

import React from 'react';

interface AdminInputProps {
  label?: string;
  type?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
}

const AdminInput = React.forwardRef<HTMLInputElement, AdminInputProps>(
  (
    {
      label,
      type = 'text',
      placeholder,
      value,
      onChange,
      error,
      required = false,
      disabled = false,
      name,
      id,
      className = '',
    },
    ref
  ) => {
    const inputId = id || name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs uppercase tracking-[0.26em] text-white/50 font-medium mb-2"
          >
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
        )}
        <input
          id={inputId}
          name={name}
          ref={ref}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full border border-white/10 rounded-lg bg-[#041114]/60 px-4 py-2 text-white/90 placeholder-white/30 transition duration-300 focus:border-teal-300/50 focus:bg-[#07171a] focus:outline-none focus:shadow-[0_0_0_4px_rgba(125,211,207,0.08)] disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'border-red-400/50' : ''
          } ${className}`}
        />
        {error && <p className="text-xs text-red-400/90 mt-1">{error}</p>}
      </div>
    );
  }
);

AdminInput.displayName = 'AdminInput';

export default AdminInput;
