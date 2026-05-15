'use client';

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
}

export default function AdminTextarea({
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
}: AdminTextareaProps) {
  const textareaId = id || name;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-xs uppercase tracking-[0.26em] text-white/50 font-medium mb-2"
        >
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={`w-full border border-white/10 rounded-lg bg-[#041114]/60 px-4 py-2 text-white/90 placeholder-white/30 transition duration-300 focus:border-teal-300/50 focus:bg-[#07171a] focus:outline-none focus:shadow-[0_0_0_4px_rgba(125,211,207,0.08)] disabled:opacity-50 disabled:cursor-not-allowed resize-none ${
          error ? 'border-red-400/50' : ''
        }`}
      />
      {error && <p className="text-xs text-red-400/90 mt-1">{error}</p>}
    </div>
  );
}
