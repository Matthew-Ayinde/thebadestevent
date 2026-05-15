'use client';

import { ReactNode } from 'react';

interface AdminButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  className?: string;
}

export default function AdminButton({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  className = '',
}: AdminButtonProps) {
  const baseStyles = 'rounded-full px-6 py-3 text-sm font-semibold transition duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-teal-300 text-slate-950 hover:bg-teal-200',
    secondary: 'border border-white/15 bg-white/5 text-white/85 backdrop-blur-sm hover:border-teal-300/40 hover:bg-white/10 hover:text-white',
    danger: 'bg-red-600/80 text-white hover:bg-red-600',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
