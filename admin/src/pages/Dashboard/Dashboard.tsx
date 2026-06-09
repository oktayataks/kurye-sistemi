import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ordersApi, couriersApi } from '../../services/api';
import type { Courier, Order, PaginatedResult } from '../../types';
import { SkeletonStatCards } from '../../components/common/Skeleton';
import { formatCurrency } from '../../utils/helpers';

const REFETCH_INTERVAL = 30_000;

function isSameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

export default function Dashboard() {
  // ─── Siparişleri çek ───────────────────────────────────────────────────────
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['dashboard-orders'],
    queryFn: () =>
      ordersApi.getAll({ limit: 200 }).then((r) => r.data as PaginatedResult<Order>),
    refetchInterval: REFETCH_INTERVAL,
  });

  // ─── Kuryeleri çek (online filtresi olmadan, hem total hem onlyOnline için) ─
  const { data: couriersData, isLoading: couriersLoading } = useQuery({
    queryKey: ['dashboard-couriers'],
    queryFn: () =>
      couriersApi
        .getAll({ limit: 200 })
        .then((r) => r.data as PaginatedResult<Courier>),
    refetchInterval: REFETCH_INTERVAL,
  });

  const orders: Order[] = ordersData?.data ?? [];
  const couriers: Courier[] = couriersData?.data ?? [];

  // ─── İstatistikler ─────────────────────────────────────────────────────────
  const today = new Date();

  const todayOrders = orders.filter((o) =>
    isSameDay(new Date(o.createdAt), today),
  );

  const deliveredOrders = orders.filter((o) => o.status === 'delivered');
  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const activeOrders = orders.filter(
    (o) => o.status === 'assigned' || o.status === 'picked_up',
  );

  const onlineCouriers = couriers.filter((c) => c.isOnline);

  const totalRevenue = deliveredOrders.reduce(
    (sum, o) => sum + (Number(o.orderTotal) || 0),
    0,
  );

  const todayRevenue = todayOrders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + (Number(o.orderTotal) || 0), 0);

  // ─── Son 7 günün sipariş adetleri (Bar chart) ──────────────────────────────
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayOrders = orders.filter((o) =>
      isSameDay(new Date(o.createdAt), date),
    );
    return {
      name: date.toLocaleDateString('tr-TR', { weekday: 'short' }),
      sipariş: dayOrders.length,
    };
  });

  // ─── Durum dağılımı (Pie chart) ────────────────────────────────────────────
  const statusData = [
    {
      name: 'Teslim Edildi',
      value: deliveredOrders.length,
      color: '#10b981',
    },
    {
      name: 'Bekliyor',
      value: pendingOrders.length,
      color: '#f59e0b',
    },
    {
      name: 'Aktif',
      value: activeOrders.length,
      color: '#6366f1',
    },
  ].filter((d) => d.value > 0);

  // ─── Son 5 sipariş ─────────────────────────────────────────────────────────
  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  // ─── Yükleniyor durumu ─────────────────────────────────────────────────────
  if (ordersLoading || couriersLoading) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonStatCards count={4} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 h-64 animate-pulse" />
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 h-64 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Canlı — her 30 sn yenilenir
        </span>
      </div>

      {/* ─── Üst İstatistik Kartları ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Toplam Sipariş</p>
              <p className="text-3xl font-bold text-gray-800">
                {orders.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">📦</span>
            </div>
          </div>
          <p className="text-xs text-green-500 mt-2">
            Bugün: {todayOrders.length} sipariş
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Aktif Kuryeler</p>
              <p className="text-3xl font-bold text-gray-800">
                {onlineCouriers.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🛵</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Toplam: {couriers.length} kurye
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Toplam Gelir</p>
              <p className="text-3xl font-bold text-gray-800">
                {formatCurrency(totalRevenue)}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
          <p className="text-xs text-green-500 mt-2">
            Bugün: {formatCurrency(todayRevenue)}
          </p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Bekleyen</p>
              <p className="text-3xl font-bold text-gray-800">
                {pendingOrders.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
          <p className="text-xs text-blue-500 mt-2">
            Aktif: {activeOrders.length} sipariş
          </p>
        </div>
      </div>

      {/* ─── Grafikler ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Son 7 Gün Bar Chart */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Son 7 Gün Sipariş
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={last7Days}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="sipariş" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Durum Dağılımı Pie Chart */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Sipariş Durumları
          </h2>
          {statusData.length > 0 ? (
            <div className="flex items-center justify-between">
              <ResponsiveContainer width="60%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {statusData.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-600">
                      {item.name}: {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400">
              Henüz sipariş yok
            </div>
          )}
        </div>
      </div>

      {/* ─── Son Siparişler ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Son Siparişler
        </h2>
        <div className="space-y-3">
          {recentOrders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between py-2 border-b border-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-xs font-bold text-purple-600">
                    #{order.orderNumber}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {order.customerName}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(order.createdAt).toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-700">
                  {formatCurrency(Number(order.orderTotal) || 0)}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    order.status === 'delivered'
                      ? 'bg-green-100 text-green-600'
                      : order.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-600'
                        : order.status === 'cancelled'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {order.status === 'delivered'
                    ? 'Teslim'
                    : order.status === 'pending'
                      ? 'Bekliyor'
                      : order.status === 'assigned'
                        ? 'Atandı'
                        : order.status === 'picked_up'
                          ? 'Yolda'
                          : 'İptal'}
                </span>
              </div>
            </div>
          ))}
          {recentOrders.length === 0 && (
            <p className="text-center text-gray-400 py-4">Henüz sipariş yok</p>
          )}
        </div>
      </div>

      {/* ─── Aktif Kuryeler ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Aktif Kuryeler
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {onlineCouriers.length > 0 ? (
            onlineCouriers.map((courier) => (
              <div
                key={courier.id}
                className="flex items-center gap-3 p-3 bg-green-50 rounded-xl"
              >
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                  {courier.user?.fullName?.charAt(0) ?? 'K'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {courier.user?.fullName ?? 'Kurye'}
                  </p>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-xs text-green-600">Online</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 col-span-2 md:col-span-4 text-center py-4">
              Aktif kurye yok
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
