import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

import { ordersApi, couriersApi } from '../../services/api';
import type { Courier, Order, PaginatedResult } from '../../types';
import { SkeletonStatCards } from '../../components/common/Skeleton';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

type DateRange = '7' | '30' | '90';

// Bin ayırıcılı, opsiyonel ondalıklı TRY gösterimi: ₺1.234 / ₺123,45
function formatTRY(amount: number, decimals = 0) {
  return (
    '₺' +
    new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount)
  );
}

export default function Reports() {
  const [dateRange, setDateRange] = useState<DateRange>('7');
  const days = Number(dateRange);

  // ─── Veri çekme ────────────────────────────────────────────────────────
  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['orders-report'],
    queryFn: () =>
      ordersApi
        .getAll({ page: 1, limit: 500 })
        .then((r) => (r.data as PaginatedResult<Order>).data),
  });

  const { data: couriers = [], isLoading: couriersLoading } = useQuery<
    Courier[]
  >({
    queryKey: ['couriers-report'],
    queryFn: () =>
      couriersApi
        .getAll({ page: 1, limit: 200 })
        .then((r) => (r.data as PaginatedResult<Courier>).data),
  });

  // ─── Tarih filtresi ────────────────────────────────────────────────────
  const rangeStart = new Date();
  rangeStart.setHours(0, 0, 0, 0);
  rangeStart.setDate(rangeStart.getDate() - (days - 1));

  const filteredOrders = orders.filter(
    (o) => new Date(o.createdAt) >= rangeStart,
  );

  // ─── Günlük sipariş & gelir ────────────────────────────────────────────
  const dailyData = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    const dateStr = date.toDateString();
    const dayOrders = filteredOrders.filter(
      (o) => new Date(o.createdAt).toDateString() === dateStr,
    );
    const delivered = dayOrders.filter((o) => o.status === 'delivered');
    return {
      name: date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
      }),
      sipariş: dayOrders.length,
      teslim: delivered.length,
      gelir: delivered.reduce(
        (sum, o) => sum + (Number(o.orderTotal) || 0),
        0,
      ),
    };
  });

  // ─── Kurye performansı ─────────────────────────────────────────────────
  const courierPerformance = couriers
    .map((courier) => {
      const courierOrders = filteredOrders.filter(
        (o) => o.courierId === courier.id,
      );
      const delivered = courierOrders.filter((o) => o.status === 'delivered');
      const revenue = delivered.reduce(
        (sum, o) => sum + (Number(o.orderTotal) || 0),
        0,
      );
      return {
        name: courier.user?.fullName?.split(' ')[0] ?? 'Kurye',
        sipariş: courierOrders.length,
        teslim: delivered.length,
        gelir: revenue,
      };
    })
    .filter((c) => c.sipariş > 0)
    .sort((a, b) => b.teslim - a.teslim);

  // ─── Durum dağılımı ────────────────────────────────────────────────────
  const statusData = [
    {
      name: 'Teslim Edildi',
      value: filteredOrders.filter((o) => o.status === 'delivered').length,
    },
    {
      name: 'Bekliyor',
      value: filteredOrders.filter((o) => o.status === 'pending').length,
    },
    {
      name: 'Atandı',
      value: filteredOrders.filter((o) => o.status === 'assigned').length,
    },
    {
      name: 'Yolda',
      value: filteredOrders.filter((o) => o.status === 'picked_up').length,
    },
  ].filter((d) => d.value > 0);

  // ─── Özet istatistikler ────────────────────────────────────────────────
  const deliveredCount = filteredOrders.filter(
    (o) => o.status === 'delivered',
  ).length;

  const totalRevenue = filteredOrders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + (Number(o.orderTotal) || 0), 0);

  const deliveryRate =
    filteredOrders.length > 0
      ? ((deliveredCount / filteredOrders.length) * 100).toFixed(1)
      : '0.0';

  // Sıfıra bölme/Infinity bug'ı engellendi:
  const avgOrderValue = deliveredCount > 0 ? totalRevenue / deliveredCount : 0;

  // ─── Yükleniyor ────────────────────────────────────────────────────────
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
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      {/* ─── Başlık + Tarih Filtresi ─────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-gray-800">Raporlar</h1>
          <p className="text-gray-400 text-xs md:text-sm">Detaylı istatistikler</p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as DateRange)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="7">Son 7 Gün</option>
          <option value="30">Son 30 Gün</option>
          <option value="90">Son 90 Gün</option>
        </select>
      </div>

      {/* ─── Özet Kartları ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-xl p-3 md:p-5 shadow-sm border border-gray-100">
          <p className="text-xs md:text-sm text-gray-500">Toplam Sipariş</p>
          <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-1">
            {filteredOrders.length}
          </p>
          <p className="text-xs text-gray-400 mt-1">Son {dateRange} gün</p>
        </div>

        <div className="bg-white rounded-xl p-3 md:p-5 shadow-sm border border-gray-100">
          <p className="text-xs md:text-sm text-gray-500">Toplam Gelir</p>
          <p className="text-lg md:text-3xl font-bold text-purple-600 mt-1 leading-tight">
            {formatTRY(totalRevenue, 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1 hidden sm:block">Teslim edilen</p>
        </div>

        <div className="bg-white rounded-xl p-3 md:p-5 shadow-sm border border-gray-100">
          <p className="text-xs md:text-sm text-gray-500">Teslimat Oranı</p>
          <p className="text-2xl md:text-3xl font-bold text-green-600 mt-1">
            %{deliveryRate}
          </p>
          <p className="text-xs text-gray-400 mt-1 hidden sm:block">Başarılı teslimat</p>
        </div>

        <div className="bg-white rounded-xl p-3 md:p-5 shadow-sm border border-gray-100">
          <p className="text-xs md:text-sm text-gray-500">Ort. Sipariş</p>
          <p className="text-lg md:text-3xl font-bold text-orange-500 mt-1 leading-tight">
            {formatTRY(avgOrderValue, 2)}
          </p>
          <p className="text-xs text-gray-400 mt-1 hidden sm:block">Sipariş başına</p>
        </div>
      </div>

      {/* ─── Günlük Sipariş & Teslim ─────────────────────────────────── */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Günlük Sipariş & Teslim
        </h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="sipariş"
              name="Sipariş"
              fill="#6366f1"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="teslim"
              name="Teslim"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ─── Günlük Gelir ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Günlük Gelir
        </h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis />
            <Tooltip
              formatter={(value) => [
                formatTRY(Number(value) || 0, 0),
                'Gelir',
              ]}
            />
            <Line
              type="monotone"
              dataKey="gelir"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ─── Kurye Performansı + Durum Dağılımı ──────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kurye Performansı */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Kurye Performansı
          </h2>
          {courierPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={courierPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={70} />
                <Tooltip />
                <Bar
                  dataKey="teslim"
                  name="Teslim"
                  fill="#6366f1"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400">
              Veri yok
            </div>
          )}
        </div>

        {/* Durum Dağılımı */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Sipariş Durum Dağılımı
          </h2>
          {statusData.length > 0 ? (
            <div className="flex items-center">
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
                    {statusData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
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
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
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
              Veri yok
            </div>
          )}
        </div>
      </div>

      {/* ─── Kurye Detay Tablosu ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Kurye Detay Raporu
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-gray-500 font-medium">
                  Kurye
                </th>
                <th className="text-center py-2 text-gray-500 font-medium">
                  Toplam
                </th>
                <th className="text-center py-2 text-gray-500 font-medium">
                  Teslim
                </th>
                <th className="text-center py-2 text-gray-500 font-medium">
                  Oran
                </th>
                <th className="text-right py-2 text-gray-500 font-medium">
                  Gelir
                </th>
              </tr>
            </thead>
            <tbody>
              {courierPerformance.length > 0 ? (
                courierPerformance.map((c, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-800">{c.name}</td>
                    <td className="py-3 text-center text-gray-600">
                      {c.sipariş}
                    </td>
                    <td className="py-3 text-center text-green-600 font-medium">
                      {c.teslim}
                    </td>
                    <td className="py-3 text-center">
                      <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded-full text-xs">
                        %
                        {c.sipariş > 0
                          ? ((c.teslim / c.sipariş) * 100).toFixed(0)
                          : 0}
                      </span>
                    </td>
                    <td className="py-3 text-right font-semibold text-gray-800">
                      {formatTRY(c.gelir, 2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Bu dönemde veri yok
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
