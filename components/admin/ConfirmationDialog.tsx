'use client';

import AdminButton from './AdminButton';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isLoading = false,
  confirmText = 'Delete',
  cancelText = 'Cancel',
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white/5 border border-white/10 rounded-[2.25rem] max-w-sm w-full backdrop-blur-sm p-8">
        <h2 className="font-serif text-xl text-white/90 mb-3">{title}</h2>
        <p className="text-white/70 mb-8">{message}</p>

        <div className="flex gap-4">
          <AdminButton
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelText}
          </AdminButton>
          <AdminButton
            variant="danger"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Deleting...' : confirmText}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
