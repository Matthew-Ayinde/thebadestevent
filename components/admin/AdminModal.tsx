'use client';

import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export default function AdminModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}: AdminModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`bg-white/5 border border-white/10 rounded-[2.25rem] ${sizeClasses[size]} w-full backdrop-blur-sm`}>
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/10">
          <h2 className="font-serif text-xl text-white/90">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition text-white/70 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
