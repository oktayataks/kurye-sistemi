import { useEffect, useState } from 'react';
import {
  MdClose,
  MdSwapHoriz,
  MdCheckCircle,
  MdLocalShipping,
  MdCancel,
  MdPending,
  MdAssignment,
} from 'react-icons/md';
import type { Order, OrderStatus } from '../../types';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../../utils/helpers';

// Backend'deki validateStatusTransition ile aynı geçiş matrisi
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['assigned', 'cancelled'],
  assigned: ['picked_up', 'cancelled'],
  picked_up: ['delivered'],
  delivered: [],
  cancelled: [],
};

const STATUS_ICONS: Record<OrderStatus, React.ReactNode> = {
  pending: <MdPending className="text-yellow-500" />,
  assigned: <MdAssignment className="text-blue-500" />,
  picked_up: <MdLocalShipping className="text-purple-500" />,
  delivered: <MdCheckCircle className="text-green-500" />,
  cancelled: <MdCancel className="text-red-500" />,
};

interface UpdateStatusModalProps {
  isOpen: boolean;
  order: Order | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (newStatus: OrderStatus) => void;
}

export default function UpdateStatusModal({
  isOpen,
  order,
  isSubmitting = false,
  onClose,
  onSubmit,
}: UpdateStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null);

  useEffect(() => {
    if (isOpen) setSelectedStatus(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !order) return null;

  const validNext = VALID_TRANSITIONS[order.status] ?? [];
  const isFinalState = validNext.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={() => !isSubmitting && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <MdSwapHoriz className="text-blue-600 text-xl" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Durumu Güncelle
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Sipariş #{order.orderNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors disabled:opacity-40"
          >
            <MdClose className="text-lg" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Mevcut Durum */}
          <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Mevcut Durum
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[order.status]}`}
            >
              {STATUS_ICONS[order.status]}
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>

          {/* Geçiş Seçenekleri */}
          {isFinalState ? (
            <div className="text-center py-6 text-sm text-gray-500">
              <MdCheckCircle className="mx-auto text-3xl text-gray-300 mb-2" />
              Bu sipariş final durumda — durum değişikliği yapılamaz.
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2.5">
                Yeni Durum Seçiniz:
              </p>
              <div className="space-y-2">
                {validNext.map((status) => (
                  <StatusOption
                    key={status}
                    status={status}
                    selected={selectedStatus === status}
                    disabled={isSubmitting}
                    onSelect={() => setSelectedStatus(status)}
                  />
                ))}
              </div>

              {selectedStatus === 'cancelled' && (
                <p className="mt-3 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                  ⚠️ İptal edilen siparişler tekrar açılamaz.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 flex items-center justify-end gap-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
          >
            İptal
          </button>
          {!isFinalState && (
            <button
              type="button"
              onClick={() => selectedStatus && onSubmit(selectedStatus)}
              disabled={!selectedStatus || isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting && (
                <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              Güncelle
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatusOptionProps {
  status: OrderStatus;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

function StatusOption({ status, selected, disabled, onSelect }: StatusOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed ${
        selected
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <span className="text-xl flex-shrink-0">{STATUS_ICONS[status]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">
          {ORDER_STATUS_LABELS[status]}
        </p>
      </div>
      {selected && (
        <MdCheckCircle className="text-indigo-500 text-lg flex-shrink-0" />
      )}
    </button>
  );
}
