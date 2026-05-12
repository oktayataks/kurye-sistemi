import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MdSearch,
  MdReceiptLong,
  MdRefresh,
  MdLocationOn,
  MdLocalShipping,
  MdPending,
  MdPhone,
  MdCalendarToday,
  MdVisibility,
} from 'react-icons/md';
import { ordersApi } from '../../services/api';
import { useMyRestaurant } from '../../hooks/useMyRestaurant';
import type { Order, OrderStatus, PaginatedResult } from '../../types';
import Card from '../../components/common/Card';
import { SkeletonTable, SkeletonStatCards } from '../../components/common/Skeleton';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  formatCurrency,
  formatDate,
  formatRelativeTime,
} from '../../utils/helpers';
import OrderDetailModal from '../Orders/OrderDetailModal';
import OrderMapModal from '../Orders/OrderMapModal';

// ─── Filter types ────────────────────────────────────────────────────────────

type DateRange = 'today' | 'week' | 'month' | 'all';

const DATE_FILTERS: { label: string; value: DateRange }[] = [
  { label: 'Bugün', value: 'today' },
  { label: 'Bu Hafta', value: 'week' },
  { label: 'Bu Ay', value: 'month' },
  { label: 'Tümü', value: 'all' },
];

const STATUS_FILTERS: { label: string; value: 'all' | OrderStatus }[] = [
  { label: 'Tümü', value: 'all' },
  { label: 'Bekliyor', value: 'pending' },
  { label: 'Atandı', value: 'assigned' },
  { label: 'Yolda', value: 'picked_up' },
  { label: 'Teslim Edildi', value: 'delivered' },
  { label: 'İptal', value: 'cancelled' },
];

// ─── Date helpers ────────────────────────────────────────────────────────────

function getDateRangeStart(range: DateRange): Date | null {
  const now = new Date();
  switch (range) {
    case 'today': {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case 'week': {
      const d = new Date(now);
      const day = d.getDay() || 7; // Pazartesi başlangıç
      d.setDate(d.getDate() - (day - 1));
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case 'month': {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    default:
      return null;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MyOrders() {
  const { restaurant, isLoading: isLoadingRestaurant } = useMyRestaurant();

  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [search, setSearch] = useState('');

  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [mapOrder, setMapOrder] = useState<Order | null>(null);

  // ─── Veri çekme ─────────────────────────────────────────────────────────────
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-orders', restaurant?.id],
    enabled: !!restaurant?.id,
    queryFn: () =>
      ordersApi
        .getAll({ page: 1, limit: 200, restaurantId: restaurant!.id })
        .then((r) => r.data as PaginatedResult<Order>),
    refetchInterval: 30_000,
  });

  // ─── Filtreleme ─────────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    const all = data?.data ?? [];
    const startDate = getDateRangeStart(dateRange);

    return all.filter((o) => {
      if (startDate && new Date(o.createdAt) < startDate) return false;
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !String(o.orderNumber).includes(q) &&
          !o.customerName.toLowerCase().includes(q) &&
          !o.customerPhone.toLowerCase().includes(q) &&
          !o.deliveryAddress.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [data, dateRange, statusFilter, search]);

  // ─── İstatistikler (filtre bazlı) ──────────────────────────────────────────
  const stats = useMemo(() => {
    const total = filteredOrders.length;
    const totalRevenue = filteredOrders
      .filter((o) => o.status === 'delivered')
      .reduce((s, o) => s + Number(o.orderTotal), 0);
    const pending = filteredOrders.filter((o) => o.status === 'pending').length;
    const active = filteredOrders.filter((o) =>
      ['assigned', 'picked_up'].includes(o.status),
    ).length;

    return { total, totalRevenue, pending, active };
  }, [filteredOrders]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleShowMapFromDetail = () => {
    if (!detailOrder) return;
    setMapOrder(detailOrder);
    setDetailOrder(null);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (isLoadingRestaurant) {
    return (
      <div className="space-y-5">
        <SkeletonStatCards count={4} />
        <Card>
          <SkeletonTable rows={6} columns={7} />
        </Card>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <Card className="p-10 text-center">
        <MdReceiptLong className="mx-auto text-5xl text-gray-300 mb-3" />
        <p className="text-base font-semibold text-gray-700">
          Restoran bilgisi bulunamadı
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <MdReceiptLong className="text-orange-600" />
            Siparişlerim
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {restaurant.name} • {data?.meta.total ?? 0} toplam sipariş
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
        >
          <MdRefresh className={isRefetching ? 'animate-spin' : ''} />
          Yenile
        </button>
      </div>

      {/* Date filter chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5 flex-shrink-0">
          <MdCalendarToday className="text-sm" />
          Dönem:
        </span>
        {DATE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setDateRange(f.value)}
            className={`flex-shrink-0 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
              dateRange === f.value
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-orange-50 hover:border-orange-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Stat boxes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat
          label="Toplam"
          value={stats.total}
          color="text-gray-700"
          bg="bg-white"
        />
        <MiniStat
          label="Bekleyen"
          value={stats.pending}
          color="text-yellow-700"
          bg="bg-yellow-50"
        />
        <MiniStat
          label="Aktif"
          value={stats.active}
          color="text-blue-700"
          bg="bg-blue-50"
        />
        <MiniStat
          label="Ciro"
          value={formatCurrency(stats.totalRevenue)}
          color="text-green-700"
          bg="bg-green-50"
          isText
        />
      </div>

      {/* Status + Search */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          {/* Status chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 flex-1">
            {STATUS_FILTERS.map((f) => {
              const count =
                f.value === 'all'
                  ? filteredOrders.length
                  : (data?.data ?? []).filter(
                      (o) =>
                        o.status === f.value &&
                        (() => {
                          const startDate = getDateRangeStart(dateRange);
                          return !startDate || new Date(o.createdAt) >= startDate;
                        })(),
                    ).length;
              return (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                    statusFilter === f.value
                      ? 'bg-gray-900 text-white shadow'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      statusFilter === f.value ? 'bg-white/20' : 'bg-white/70'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative lg:w-64">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
            <input
              type="text"
              placeholder="Müşteri, telefon, adres..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>
      </Card>

      {/* Tablo */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={6} columns={8} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {[
                    'Sipariş',
                    'Müşteri',
                    'Adres',
                    'Kurye',
                    'Tutar',
                    'Durum',
                    'Tarih',
                    '',
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onDetail={() => setDetailOrder(order)}
                  />
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-16">
                      <MdReceiptLong className="mx-auto text-5xl text-gray-300 mb-3" />
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Sipariş bulunamadı
                      </p>
                      <p className="text-xs text-gray-500">
                        Seçtiğiniz filtrelere uyan sipariş yok.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modals */}
      <OrderDetailModal
        isOpen={!!detailOrder}
        order={detailOrder}
        onClose={() => setDetailOrder(null)}
        onShowMap={handleShowMapFromDetail}
      />
      <OrderMapModal
        isOpen={!!mapOrder}
        order={mapOrder}
        onClose={() => setMapOrder(null)}
      />
    </div>
  );
}

// ─── Mini Stat ───────────────────────────────────────────────────────────────

function MiniStat({
  label,
  value,
  color,
  bg,
  isText,
}: {
  label: string;
  value: number | string;
  color: string;
  bg: string;
  isText?: boolean;
}) {
  return (
    <div className={`${bg} rounded-xl px-4 py-3 border border-gray-100`}>
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
        {label}
      </p>
      <p
        className={`font-bold ${color} ${isText ? 'text-base mt-1' : 'text-2xl mt-0.5'}`}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Order Row ───────────────────────────────────────────────────────────────

function OrderRow({
  order,
  onDetail,
}: {
  order: Order;
  onDetail: () => void;
}) {
  return (
    <tr className="hover:bg-orange-50/40 transition-colors">
      <td className="px-4 py-3">
        <p className="font-mono text-sm font-semibold text-gray-800">
          #{order.orderNumber}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {formatRelativeTime(order.createdAt)}
        </p>
      </td>

      <td className="px-4 py-3 max-w-[140px]">
        <p className="font-medium text-gray-900 truncate">
          {order.customerName}
        </p>
        <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
          <MdPhone className="text-xs" />
          {order.customerPhone}
        </p>
      </td>

      <td className="px-4 py-3 max-w-[200px]">
        <p className="text-xs text-gray-600 line-clamp-2 leading-snug flex items-start gap-1">
          <MdLocationOn className="text-sm flex-shrink-0 mt-0.5" />
          <span>{order.deliveryAddress}</span>
        </p>
      </td>

      <td className="px-4 py-3 max-w-[140px]">
        {order.courier ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {(order.courier.user?.fullName ?? '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">
                {order.courier.user?.fullName ?? '—'}
              </p>
              {order.courier.isOnline && (
                <p className="text-[10px] text-green-600 flex items-center gap-0.5">
                  <span className="w-1 h-1 bg-green-500 rounded-full" />
                  Online
                </p>
              )}
            </div>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full border border-yellow-200">
            <MdPending className="text-sm" />
            Bekliyor
          </span>
        )}
      </td>

      <td className="px-4 py-3">
        <p className="font-semibold text-gray-800">
          {formatCurrency(order.orderTotal)}
        </p>
        {Number(order.deliveryFee) > 0 && (
          <p className="text-[10px] text-gray-400">
            +{formatCurrency(order.deliveryFee)} kargo
          </p>
        )}
      </td>

      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[order.status]}`}
        >
          {order.status === 'picked_up' && (
            <MdLocalShipping className="text-xs" />
          )}
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </td>

      <td className="px-4 py-3">
        <p className="text-[11px] text-gray-500 font-mono">
          {formatDate(order.createdAt)}
        </p>
      </td>

      <td className="px-4 py-3">
        <button
          onClick={onDetail}
          title="Detay"
          className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
        >
          <MdVisibility className="text-base" />
        </button>
      </td>
    </tr>
  );
}
