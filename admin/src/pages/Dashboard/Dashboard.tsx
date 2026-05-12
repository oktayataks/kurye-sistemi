import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  MdShoppingCart, MdDeliveryDining, MdPending, MdCheckCircle,
} from 'react-icons/md';
import { ordersApi, couriersApi } from '../../services/api';
import StatCard from '../../components/common/StatCard';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import { SkeletonStatCards, SkeletonTable } from '../../components/common/Skeleton';
import type { Order, PaginatedResult } from '../../types';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from '../../utils/helpers';

const REFETCH_INTERVAL = 30_000;

const PIE_COLORS = ['#eab308', '#6366f1', '#a855f7', '#22c55e', '#ef4444'];

function isSameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

export default function Dashboard() {
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['dashboard-orders'],
    queryFn: () => ordersApi.getAll({ limit: 200 }).then((r) => r.data as PaginatedResult<Order>),
    refetchInterval: REFETCH_INTERVAL,
  });

  const { data: activeCouriersData } = useQuery({
    queryKey: ['dashboard-couriers-online'],
    queryFn: () => couriersApi.getAll({ isOnline: true, limit: 200 }).then((r) => r.data),
    refetchInterval: REFETCH_INTERVAL,
  });

  const orders: Order[] = ordersData?.data ?? [];
  const today = new Date();

  // ─── İstatistikler ──────────────────────────────────────────────────────────
  const todayOrders = orders.filter((o) => isSameDay(new Date(o.createdAt), today)).length;
  const activeCouriers = activeCouriersData?.meta?.total ?? 0;
  const pendingOrders = orders.filter((o) => o.status === 'pending').length;
  const completedOrders = orders.filter((o) => o.status === 'delivered').length;

  // ─── Çizgi grafik: son 7 gün ────────────────────────────────────────────────
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
    const count = orders.filter((o) => isSameDay(new Date(o.createdAt), d)).length;
    return { label, count };
  });

  // ─── Pasta grafik: durum dağılımı ──────────────────────────────────────────
  const statusCounts = (['pending', 'assigned', 'picked_up', 'delivered', 'cancelled'] as const)
    .map((s) => ({
      name: ORDER_STATUS_LABELS[s],
      value: orders.filter((o) => o.status === s).length,
    }))
    .filter((s) => s.value > 0);

  // ─── Son 10 sipariş ─────────────────────────────────────────────────────────
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  if (ordersLoading) {
    return (
      <div className="space-y-6">
        <SkeletonStatCards count={4} />
        <Card>
          <SkeletonTable rows={6} columns={4} />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-0.5">Canlı genel bakış — her 30 saniyede güncellenir</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Canlı
        </span>
      </div>

      {/* ─── 4 İstatistik Kartı ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Toplam Sipariş (Bugün)"
          value={todayOrders}
          icon={MdShoppingCart}
          color="indigo"
        />
        <StatCard
          title="Aktif Kuryeler"
          value={activeCouriers}
          icon={MdDeliveryDining}
          color="green"
          subtitle="çevrimiçi"
        />
        <StatCard
          title="Bekleyen Siparişler"
          value={pendingOrders}
          icon={MdPending}
          color="yellow"
        />
        <StatCard
          title="Tamamlanan Siparişler"
          value={completedOrders}
          icon={MdCheckCircle}
          color="green"
        />
      </div>

      {/* ─── Grafikler ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Çizgi grafik */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Son 7 Gün Sipariş</h3>
          <p className="text-xs text-gray-400 mb-4">Günlük sipariş adedi</p>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={last7Days} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.1)' }}
                labelStyle={{ fontWeight: 600, color: '#374151' }}
                formatter={(value) => [Number(value ?? 0), 'Sipariş']}
              />
              <Line
                type="monotone"
                dataKey="count"
                name="Sipariş"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Pasta grafik */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Sipariş Durumu Dağılımı</h3>
          <p className="text-xs text-gray-400 mb-4">Tüm siparişler</p>
          {statusCounts.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={statusCounts}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="42%"
                  innerRadius={55}
                  outerRadius={82}
                  paddingAngle={3}
                >
                  {statusCounts.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.1)' }}
                  formatter={(value, name) => [Number(value ?? 0), String(name ?? '')]}
                />
                <Legend iconSize={9} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              Henüz sipariş yok
            </div>
          )}
        </Card>
      </div>

      {/* ─── Canlı Sipariş Listesi (Son 10) ────────────────────────────── */}
      <Card>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Canlı Sipariş Listesi</h3>
            <p className="text-xs text-gray-400 mt-0.5">Son 10 sipariş</p>
          </div>
          <span className="text-xs text-gray-400">
            {recentOrders.length} kayıt
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {['Sipariş No', 'Restoran', 'Kurye', 'Durum'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-gray-600 font-medium">
                      #{order.orderNumber}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-700 font-medium">
                    {order.restaurant?.name ?? (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">
                    {order.courier?.user?.fullName ?? (
                      <span className="text-gray-400 text-xs italic">Atanmadı</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge
                      label={ORDER_STATUS_LABELS[order.status]}
                      className={ORDER_STATUS_COLORS[order.status]}
                    />
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-gray-400 text-sm">
                    Henüz sipariş bulunmuyor
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
