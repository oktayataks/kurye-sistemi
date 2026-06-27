import { useQuery } from '@tanstack/react-query';
import { MdClose, MdPhone, MdLocationOn, MdStore } from 'react-icons/md';
import type { Restaurant, Order, PaginatedResult } from '../../types';
import { ordersApi } from '../../services/api';

interface Props {
  restaurant: Restaurant;
  onClose: () => void;
}

export default function RestaurantDetailModal({ restaurant, onClose }: Props) {
  const { data: ordersData } = useQuery({
    queryKey: ['restaurant-orders-detail', restaurant.id],
    queryFn: () =>
      ordersApi
        .getAll({ page: 1, limit: 200, restaurantId: restaurant.id } as any)
        .then((r) => r.data as PaginatedResult<Order>),
    enabled: !!restaurant.id,
  });

  const allOrders: Order[] = ordersData?.data ?? [];
  const activeOrders = allOrders.filter(
    (o) => o.status === 'pending' || o.status === 'assigned' || o.status === 'picked_up',
  );
  const deliveredOrders = allOrders.filter((o) => o.status === 'delivered');
  const totalRevenue = deliveredOrders.reduce((s, o) => s + Number(o.orderTotal), 0);

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
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <MdStore className="text-orange-500 text-2xl" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">{restaurant.name}</h3>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full ${restaurant.isActive ? 'bg-green-500' : 'bg-gray-400'}`}
                />
                {restaurant.isActive ? 'Aktif' : 'Pasif'}
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
          <div className="space-y-2">
            {restaurant.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                <MdPhone className="text-gray-400 shrink-0" />
                <span>{restaurant.phone}</span>
              </div>
            )}
            {restaurant.address && (
              <div className="flex items-start gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                <MdLocationOn className="text-gray-400 shrink-0 mt-0.5" />
                <span>{restaurant.address}</span>
              </div>
            )}
          </div>

          {/* Özet istatistikler */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Toplam Sipariş" value={allOrders.length} color="blue" />
            <StatCard label="Tamamlanan" value={deliveredOrders.length} color="green" />
            <StatCard label="Aktif" value={activeOrders.length} color="orange" />
            <StatCard label="Ciro" value={`₺${totalRevenue.toFixed(0)}`} color="indigo" />
          </div>

          {/* Aktif siparişler */}
          {activeOrders.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
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
            <p className="text-sm text-gray-400 text-center py-4">Henüz sipariş kaydı yok</p>
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
  color: 'blue' | 'green' | 'orange' | 'indigo';
}) {
  const colors = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    orange: 'text-orange-600 bg-orange-50',
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
        <span className="text-xs font-medium text-gray-600">₺{Number(order.orderTotal).toFixed(0)}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[order.status] ?? 'bg-gray-100 text-gray-600'}`}
        >
          {statusLabels[order.status] ?? order.status}
        </span>
      </div>
    </div>
  );
}
