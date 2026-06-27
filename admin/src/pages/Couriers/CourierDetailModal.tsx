import { useQuery } from '@tanstack/react-query';
import { MdClose, MdPhone, MdEmail, MdDeliveryDining } from 'react-icons/md';
import type { Courier, Order } from '../../types';
import { ordersApi } from '../../services/api';
import { VEHICLE_LABELS } from '../../utils/helpers';

interface Props {
  courier: Courier;
  onClose: () => void;
}

const VEHICLE_ICONS: Record<string, string> = { bike: '🚲', motorbike: '🛵', car: '🚗' };

export default function CourierDetailModal({ courier, onClose }: Props) {
  const { data: allOrders = [] } = useQuery<Order[]>({
    queryKey: ['courier-orders', courier.id],
    queryFn: async () => {
      const res = await ordersApi.getAll({
        courierId: courier.id,
        limit: 100,
      } as any);
      const data = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
      return data.filter((o: Order) => o.courierId === courier.id);
    },
    enabled: !!courier.id,
  });
  const activeOrders = allOrders.filter(
    (o) => o.status === 'assigned' || o.status === 'picked_up',
  );
  const deliveredOrders = allOrders.filter((o) => o.status === 'delivered');
  const totalEarnings = deliveredOrders.reduce((s, o) => s + Number(o.deliveryFee), 0);

  const acceptanceRate = Number(courier.acceptanceRate ?? 100).toFixed(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
              {courier.user?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {courier.user?.fullName ?? 'Kurye'}
              </h3>
              <p className="text-xs text-gray-500">
                {VEHICLE_ICONS[courier.vehicleType]} {VEHICLE_LABELS[courier.vehicleType]}
                {' · '}
                <span
                  className={`font-medium ${courier.isOnline ? 'text-green-600' : 'text-gray-400'}`}
                >
                  {courier.isOnline ? '● Online' : '○ Offline'}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
          >
            <MdClose className="text-lg" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* İletişim */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {courier.user?.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                <MdEmail className="text-gray-400 shrink-0" />
                <span className="truncate">{courier.user.email}</span>
              </div>
            )}
            {courier.user?.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                <MdPhone className="text-gray-400 shrink-0" />
                <span>{courier.user.phone}</span>
              </div>
            )}
          </div>

          {/* Özet istatistikler */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Aktif Sipariş"
              value={`${courier.currentOrders}/4`}
              color="blue"
            />
            <StatCard
              label="Toplam Teslimat"
              value={deliveredOrders.length}
              color="green"
            />
            <StatCard
              label="Kabul Oranı"
              value={`%${acceptanceRate}`}
              color={Number(acceptanceRate) >= 80 ? 'green' : 'red'}
            />
            <StatCard
              label="Toplam Kazanç"
              value={`₺${totalEarnings.toFixed(0)}`}
              color="indigo"
            />
          </div>

          {/* Performans */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Performans</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center bg-blue-50 rounded-xl py-3">
                <p className="text-xl font-bold text-blue-600">{courier.totalOffered ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">Teklif</p>
              </div>
              <div className="text-center bg-green-50 rounded-xl py-3">
                <p className="text-xl font-bold text-green-600">{courier.totalAccepted ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">Kabul</p>
              </div>
              <div className="text-center bg-red-50 rounded-xl py-3">
                <p className="text-xl font-bold text-red-500">{courier.totalRejected ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">Red</p>
              </div>
            </div>
          </div>

          {/* Aktif siparişler */}
          {activeOrders.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <MdDeliveryDining className="text-indigo-500" />
                Aktif Siparişler ({activeOrders.length})
              </h4>
              <div className="space-y-2">
                {activeOrders.map((o) => (
                  <OrderRow key={o.id} order={o} />
                ))}
              </div>
            </div>
          )}

          {/* Son teslimatlar */}
          {deliveredOrders.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Son Teslimatlar ({deliveredOrders.length})
              </h4>
              <div className="space-y-2">
                {deliveredOrders.slice(0, 5).map((o) => (
                  <OrderRow key={o.id} order={o} />
                ))}
                {deliveredOrders.length > 5 && (
                  <p className="text-xs text-gray-400 text-center pt-1">
                    +{deliveredOrders.length - 5} daha fazla teslimat
                  </p>
                )}
              </div>
            </div>
          )}

          {allOrders.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              Henüz sipariş kaydı yok
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'red' | 'indigo';
}) {
  const colors = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    red: 'text-red-500 bg-red-50',
    indigo: 'text-indigo-600 bg-indigo-50',
  };
  return (
    <div className={`rounded-xl px-3 py-3 text-center ${colors[color]}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    assigned: 'bg-blue-100 text-blue-700',
    picked_up: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
  };
  const statusLabels: Record<string, string> = {
    pending: 'Bekliyor',
    assigned: 'Atandı',
    picked_up: 'Alındı',
    delivered: 'Teslim',
    cancelled: 'İptal',
  };
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5 text-sm">
      <div className="min-w-0">
        <p className="font-medium text-gray-800 truncate">
          #{order.orderNumber} · {order.customerName}
        </p>
        <p className="text-xs text-gray-500 truncate">{order.deliveryAddress}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <span className="text-xs font-medium text-gray-600">₺{Number(order.deliveryFee).toFixed(0)}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {statusLabels[order.status] ?? order.status}
        </span>
      </div>
    </div>
  );
}
