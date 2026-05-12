import { useEffect } from 'react';
import { MdWarning, MdClose } from 'react-icons/md';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_STYLES: Record<NonNullable<ConfirmDialogProps['variant']>, {
  icon: string;
  iconBg: string;
  button: string;
}> = {
  danger: {
    icon: 'text-red-600',
    iconBg: 'bg-red-100',
    button: 'bg-red-600 hover:bg-red-700 active:bg-red-800',
  },
  warning: {
    icon: 'text-yellow-600',
    iconBg: 'bg-yellow-100',
    button: 'bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800',
  },
  info: {
    icon: 'text-indigo-600',
    iconBg: 'bg-indigo-100',
    button: 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800',
  },
};

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Onayla',
  cancelLabel = 'İptal',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const styles = VARIANT_STYLES[variant];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={() => !isLoading && onCancel()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 p-6">
          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${styles.iconBg}`}>
            <MdWarning className={`text-2xl ${styles.icon}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold text-gray-900">{title}</h3>
              <button
                onClick={onCancel}
                disabled={isLoading}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-40 transition-colors"
              >
                <MdClose className="text-lg" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-3 flex items-center justify-end gap-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60 ${styles.button}`}
          >
            {isLoading && (
              <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
