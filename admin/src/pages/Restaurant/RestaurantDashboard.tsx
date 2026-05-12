import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  MdReceiptLong,
  MdPending,
  MdCheckCircle,
  MdAccessTime,
  MdAddCircleOutline,
  MdLocalShipping,
  MdRestaurant,
  MdLocationOn,
  MdOpenInNew,
} from 'react-icons/md';
import { ordersApi } from '../../services/api';
import { useMyRestaurant } from '../../hooks/useMyRestaurant';
import type { Order, PaginatedResult } from '../../types';
import Card from '../../components/common/Card';
import { SkeletonStatCards } from '../../components/common/Skeleton';
import StatCard from '../../components/common/StatCard';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  formatCurrency,
  formatRelativeTime,
} from '../../utils/helpers';

export default function RestaurantDashboard() {
  const { restaurant, isLoading: isLoadingRestaurant } = useMyRestaurant();

  // Tüm siparişleri çek (filtreleri frontend'de uyguluyoruz)
  const { data, isLoading } = useQuery({
    queryKey: ['my-restaurant-orders', restaurant?.id],
    enabled: !!restaurant?.id,
    queryFn: () =>
      ordersApi
        .getAll({ page: 1, limit: 200, restaurantId: restaurant!.id })
        .then((r) => r.data as PaginatedResult<Order>),
    refetchInterval: 30_000,
  });

  // ─── İstatistikler ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const orders = data?.data ?? [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = orders.filter(
      (o) => new Date(o.createdAt) >= today,
    );
    const pending = orders.filter((o) => o.status === 'pending');
    const delivered = orders.filter((o) => o.status === 'delivered');

    // Ortalama teslimat süresi: createdAt → deliveredAt (dakika cinsinden)
    const deliveredWithTime = delivered.filter((o) => o.deliveredAt);
    const avgDeliveryMin =
      deliveredWithTime.length === 0
        ? 0
        : Math.round(
            deliveredWithTime.reduce((sum, o) => {
              const diff =
                new Date(o.deliveredAt!).getTime() -
                new Date(o.createdAt).getTime();
              return sum + diff / 60_000;
            }, 0) / deliveredWithTime.length,
          );

    return {
      todayCount: todayOrders.length,
      pendingCount: pending.length,
      deliveredCount: delivered.length,
      totalRevenue: delivered.reduce((s, o) => s + Number(o.orderTotal), 0),
      avgDeliveryMin,
      recent: orders.slice(0, 5),
    };
  }, [data]);

  // ─── Restoran yok / yükleniyor ─────────────────────────────────────────────
  if (isLoadingRestaurant) {
    return (
      <div className="space-y-5">
        <div className="h-32 rounded-2xl bg-gradient-to-br from-orange-200/40 to-amber-200/40 animate-pulse" />
        <SkeletonStatCards count={4} />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <Card className="p-10 text-center">
        <MdRestaurant className="mx-auto text-5xl text-gray-300 mb-3" />
        <p className="text-base font-semibold text-gray-700 mb-1">
          Restoran bulunamadı
        </p>
        <p className="text-sm text-gray-500">
          Hesabınıza atanmış bir restoran yok. Lütfen yöneticiyle iletişime
          geçin.
        </p>
      </Card>
    );
  }

  // ─── Ana ekran ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-700 rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute -right-16 -bottom-12 w-56 h-56 rounded-full bg-white/5" />

        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-orange-100 text-sm">Hoş geldiniz</p>
              <h2 className="text-2xl font-bold mt-0.5">{restaurant.name}</h2>
              <p className="text-orange-100 text-xs mt-1 flex items-center gap-1">
                <MdLocationOn className="text-base" />
                {restaurant.address}
              </p>
            </div>

            <Link
              to="/restaurant/create-order"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-orange-700 hover:bg-orange-50 active:bg-orange-100 rounded-lg text-sm font-semibold shadow-md transition-all"
            >
              <MdAddCircleOutline className="text-lg" />
              Yeni Sipariş
            </Link>
          </div>
        </div>
      </div>

      {/* İstatistik kartları */}
      {isLoading ? (
        <SkeletonStatCards count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Bugünkü Sipariş"
            value={stats.todayCount}
            icon={MdReceiptLong}
            color="indigo"
          />
          <StatCard
            title="Bekleyen"
            value={stats.pendingCount}
            icon={MdPending}
            color="yellow"
          />
          <StatCard
            title="Teslim Edilen"
            value={stats.deliveredCount}
            icon={MdCheckCircle}
            color="green"
            subtitle={formatCurrency(stats.totalRevenue)}
          />
          <StatCard
            title="Ort. Teslimat Süresi"
            value={
              stats.avgDeliveryMin > 0 ? `${stats.avgDeliveryMin} dk` : '—'
            }
            icon={MdAccessTime}
            color="purple"
            subtitle={
              stats.deliveredCount > 0
                ? `${stats.deliveredCount} sipariş üzerinden`
                : 'Henüz veri yok'
            }
          />
        </div>
      )}

      {/* Son Siparişler */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Son Siparişler
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              En yeni 5 sipariş
            </p>
          </div>
          <Link
            to="/restaurant/my-orders"
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1"
          >
            Tümünü Gör
            <MdOpenInNew className="text-sm" />
          </Link>
        </div>

        {stats.recent.length === 0 ? (
          <div className="text-center py-12">
            <MdReceiptLong className="mx-auto text-5xl text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-700 mb-1">
              Henüz sipariş yok
            </p>
            <p className="text-xs text-gray-500">
              İlk siparişinizi oluşturmak için "Yeni Sipariş" butonunu
              kullanın.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {stats.recent.map((order) => (
              <div
                key={order.id}
                className="px-5 py-3.5 flex items-center gap-4 hover:bg-orange-50/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <span className="font-mono text-xs font-bold text-orange-700">
                    #{order.orderNumber}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {order.customerName}
                  </p>
                  <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                    <MdLocationOn className="text-xs flex-shrink-0" />
                    {order.deliveryAddress}
                  </p>
                </div>

                <div className="hidden sm:block text-right">
                  <p className="text-xs text-gray-500">
                    {formatRelativeTime(order.createdAt)}
                  </p>
                  {order.courier ? (
                    <p className="text-[10px] text-gray-500 flex items-center gap-1 justify-end mt-0.5">
                      <MdLocalShipping />
                      {order.courier.user?.fullName}
                    </p>
                  ) : (
                    <p className="text-[10px] text-yellow-600 mt-0.5">
                      Atama bekliyor
                    </p>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-gray-800">
                    {formatCurrency(order.orderTotal)}
                  </p>
                  <span
                    className={`inline-flex px-2 py-0.5 mt-1 rounded-full text-[10px] font-medium ${ORDER_STATUS_COLORS[order.status]}`}
                  >
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
