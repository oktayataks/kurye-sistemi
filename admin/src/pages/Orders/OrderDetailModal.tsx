import { useEffect } from 'react';
import {
  MdClose,
  MdReceipt,
  MdRestaurant,
  MdPerson,
  MdLocationOn,
  MdLocalShipping,
  MdAttachMoney,
  MdNotes,
  MdMap,
  MdPhone,
  MdAccessTime,
  MdCheckCircle,
  MdCancel,
  MdAssignment,
  MdPending,
  MdStar,
  MdContentCopy,
} from 'react-icons/md';
import type { Order, OrderStatus } from '../../types';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  formatDate,
  formatCurrency,
  VEHICLE_LABELS,
} from '../../utils/helpers';
import { toast } from 'react-toastify';

interface OrderDetailModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
  onShowMap: () => void;
}

export default function OrderDetailModal({
  isOpen,
  order,
  onClose,
  onShowMap,
}: OrderDetailModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const subtotal = Number(order.orderTotal) - Number(order.deliveryFee ?? 0);

  const copyOrderNumber = () => {
    navigator.clipboard.writeText(`#${order.orderNumber}`);
    toast.success('Sipariş numarası kopyalandı', { autoClose: 1500 });
  };

  const hasAnyLocation =
    !!order.restaurant?.latitude ||
    !!order.deliveryLatitude ||
    !!order.courier?.latitude;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <MdReceipt className="text-indigo-600 text-xl" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-gray-900">
                  Sipariş Detayı
                </h3>
                <button
                  onClick={copyOrderNumber}
                  className="text-xs font-mono text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
                  title="Kopyala"
                >
                  #{order.orderNumber}
                  <MdContentCopy className="text-xs" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatDate(order.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[order.status]}`}
            >
              {ORDER_STATUS_LABELS[order.status]}
            </span>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
            >
              <MdClose className="text-lg" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* Üst sıra: Restoran ve Müşteri */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Restoran */}
              <InfoCard
                icon={<MdRestaurant className="text-orange-500" />}
                title="Restoran"
                color="orange"
              >
                <p className="font-semibold text-gray-900">
                  {order.restaurant?.name ?? '—'}
                </p>
                {order.restaurant?.address && (
                  <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                    <MdLocationOn className="text-sm mt-0.5 flex-shrink-0" />
                    {order.restaurant.address}
                  </p>
                )}
                {order.restaurant?.phone && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <MdPhone className="text-sm" />
                    {order.restaurant.phone}
                  </p>
                )}
              </InfoCard>

              {/* Müşteri */}
              <InfoCard
                icon={<MdPerson className="text-blue-500" />}
                title="Müşteri"
                color="blue"
              >
                <p className="font-semibold text-gray-900">{order.customerName}</p>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <MdPhone className="text-sm" />
                  {order.customerPhone}
                </p>
                <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                  <MdLocationOn className="text-sm mt-0.5 flex-shrink-0" />
                  {order.deliveryAddress}
                </p>
              </InfoCard>
            </div>

            {/* Kurye */}
            <InfoCard
              icon={<MdLocalShipping className="text-indigo-500" />}
              title="Kurye"
              color="indigo"
            >
              {order.courier ? (
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                    {(order.courier.user?.fullName ?? '?')
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">
                      {order.courier.user?.fullName ?? '—'}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      <span>{VEHICLE_LABELS[order.courier.vehicleType]}</span>
                      {order.courier.user?.phone && (
                        <span className="flex items-center gap-1">
                          <MdPhone className="text-sm" />
                          {order.courier.user.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MdStar className="text-yellow-400" />
                        {Number(order.courier.rating).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      order.courier.isOnline
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {order.courier.isOnline ? '● Online' : '○ Offline'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-yellow-600">
                  <MdPending className="text-lg" />
                  <span className="font-medium">Atama Bekliyor</span>
                </div>
              )}
            </InfoCard>

            {/* Ödeme */}
            <InfoCard
              icon={<MdAttachMoney className="text-green-500" />}
              title="Ödeme"
              color="green"
            >
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Sipariş Tutarı</span>
                  <span className="font-medium text-gray-700">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Teslimat Ücreti</span>
                  <span className="font-medium text-gray-700">
                    {formatCurrency(order.deliveryFee ?? 0)}
                  </span>
                </div>
                <div className="border-t border-gray-200 my-2" />
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-700">Toplam</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(order.orderTotal)}
                  </span>
                </div>
              </div>
            </InfoCard>

            {/* Notlar */}
            {order.notes && (
              <InfoCard
                icon={<MdNotes className="text-yellow-600" />}
                title="Notlar"
                color="yellow"
              >
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {order.notes}
                </p>
              </InfoCard>
            )}

            {/* Durum Geçmişi (Timeline) */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MdAccessTime className="text-gray-400 text-lg" />
                <h4 className="text-sm font-semibold text-gray-700">
                  Durum Geçmişi
                </h4>
              </div>
              <Timeline order={order} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 flex items-center justify-end gap-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Kapat
          </button>
          <button
            type="button"
            onClick={onShowMap}
            disabled={!hasAnyLocation}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <MdMap />
            Haritada Göster
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── InfoCard ────────────────────────────────────────────────────────────────

interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  color: 'orange' | 'blue' | 'indigo' | 'green' | 'yellow';
  children: React.ReactNode;
}

function InfoCard({ icon, title, color, children }: InfoCardProps) {
  const colorMap = {
    orange: 'bg-orange-50 border-orange-100',
    blue: 'bg-blue-50 border-blue-100',
    indigo: 'bg-indigo-50 border-indigo-100',
    green: 'bg-green-50 border-green-100',
    yellow: 'bg-yellow-50 border-yellow-100',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-700">
          {title}
        </span>
      </div>
      <div>{children}</div>
    </div>
  );
}

// ─── Timeline ────────────────────────────────────────────────────────────────

interface TimelineEvent {
  status: OrderStatus;
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  timestamp: string | null;
  active: boolean;
  current: boolean;
}

function Timeline({ order }: { order: Order }) {
  const isCancelled = order.status === 'cancelled';

  const events: TimelineEvent[] = isCancelled
    ? [
        {
          status: 'pending',
          label: 'Sipariş Oluşturuldu',
          icon: <MdPending />,
          color: 'text-yellow-600',
          bg: 'bg-yellow-100',
          timestamp: order.createdAt,
          active: true,
          current: false,
        },
        {
          status: 'cancelled',
          label: 'İptal Edildi',
          icon: <MdCancel />,
          color: 'text-red-600',
          bg: 'bg-red-100',
          timestamp: order.cancelledAt,
          active: true,
          current: true,
        },
      ]
    : [
        {
          status: 'pending',
          label: 'Sipariş Oluşturuldu',
          icon: <MdPending />,
          color: 'text-yellow-600',
          bg: 'bg-yellow-100',
          timestamp: order.createdAt,
          active: true,
          current: order.status === 'pending',
        },
        {
          status: 'assigned',
          label: 'Kurye Atandı',
          icon: <MdAssignment />,
          color: 'text-blue-600',
          bg: 'bg-blue-100',
          timestamp: order.assignedAt,
          active: ['assigned', 'picked_up', 'delivered'].includes(order.status),
          current: order.status === 'assigned',
        },
        {
          status: 'picked_up',
          label: 'Teslim Alındı',
          icon: <MdLocalShipping />,
          color: 'text-purple-600',
          bg: 'bg-purple-100',
          timestamp: order.pickedUpAt,
          active: ['picked_up', 'delivered'].includes(order.status),
          current: order.status === 'picked_up',
        },
        {
          status: 'delivered',
          label: 'Teslim Edildi',
          icon: <MdCheckCircle />,
          color: 'text-green-600',
          bg: 'bg-green-100',
          timestamp: order.deliveredAt,
          active: order.status === 'delivered',
          current: order.status === 'delivered',
        },
      ];

  return (
    <ol className="relative border-l-2 border-gray-100 ml-4 space-y-5">
      {events.map((event) => (
        <li key={event.status} className="ml-6">
          {/* Icon */}
          <span
            className={`absolute -left-[18px] flex items-center justify-center w-9 h-9 rounded-full border-4 border-white text-base ${
              event.active ? event.bg : 'bg-gray-100'
            } ${event.current ? 'ring-2 ring-offset-2 ring-indigo-300' : ''}`}
          >
            <span
              className={event.active ? event.color : 'text-gray-300'}
            >
              {event.icon}
            </span>
          </span>

          {/* Content */}
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h5
              className={`text-sm font-semibold ${
                event.active ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {event.label}
              {event.current && (
                <span className="ml-2 text-xs font-medium bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase tracking-wide">
                  Mevcut
                </span>
              )}
            </h5>
            {event.timestamp && (
              <time className="text-xs text-gray-500 font-mono">
                {formatDate(event.timestamp)}
              </time>
            )}
          </div>
          {!event.active && !event.timestamp && (
            <p className="text-xs text-gray-400 italic mt-0.5">Henüz tamamlanmadı</p>
          )}
        </li>
      ))}
    </ol>
  );
}
