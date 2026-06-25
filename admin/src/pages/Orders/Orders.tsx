import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  MdSearch,
  MdFilterList,
  MdReceiptLong,
  MdRefresh,
  MdVisibility,
  MdLocalShipping,
  MdSwapHoriz,
  MdAutoAwesome,
  MdDelete,
  MdRestaurant,
  MdCalendarToday,
  MdPending,
} from 'react-icons/md';
import { couriersApi, ordersApi, restaurantsApi } from '../../services/api';
import type {
  Courier,
  Order,
  OrderStatus,
  PaginatedResult,
  Restaurant,
} from '../../types';
import Card from '../../components/common/Card';
import { SkeletonTable } from '../../components/common/Skeleton';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  formatCurrency,
  formatRelativeTime,
} from '../../utils/helpers';

import OrderDetailModal from './OrderDetailModal';
import OrderMapModal from './OrderMapModal';
import UpdateStatusModal from './UpdateStatusModal';
import AssignCourierModal, {
  type AutoAssignmentResult,
} from './AssignCourierModal';

// ─── Status filter chip definitions ──────────────────────────────────────────

const STATUS_FILTERS: { label: string; value: 'all' | OrderStatus; color: string }[] = [
  { label: 'Tümü', value: 'all', color: 'bg-gray-100 text-gray-700' },
  { label: 'Bekleyen', value: 'pending', color: 'bg-yellow-100 text-yellow-800' },
  { label: 'Atandı', value: 'assigned', color: 'bg-blue-100 text-blue-800' },
  { label: 'Teslim Alındı', value: 'picked_up', color: 'bg-purple-100 text-purple-800' },
  { label: 'Teslim Edildi', value: 'delivered', color: 'bg-green-100 text-green-800' },
  { label: 'İptal', value: 'cancelled', color: 'bg-red-100 text-red-800' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function Orders() {
  const queryClient = useQueryClient();

  // ─── State ──────────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [restaurantFilter, setRestaurantFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [search, setSearch] = useState('');

  // Modal states
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [mapOrder, setMapOrder] = useState<Order | null>(null);
  const [statusOrder, setStatusOrder] = useState<Order | null>(null);
  const [assignOrder, setAssignOrder] = useState<Order | null>(null);
  const [deleteOrder, setDeleteOrder] = useState<Order | null>(null);
  const [autoResult, setAutoResult] = useState<AutoAssignmentResult | null>(null);

  // ─── Veri çekme ─────────────────────────────────────────────────────────────
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['orders', page, restaurantFilter],
    queryFn: () =>
      ordersApi
        .getAll({
          page,
          limit: 20,
          ...(restaurantFilter !== 'all' && { restaurantId: restaurantFilter }),
        })
        .then((r) => r.data as PaginatedResult<Order>),
  });

  const { data: restaurantsData } = useQuery({
    queryKey: ['restaurants', 'for-filter'],
    queryFn: () =>
      restaurantsApi
        .getAll({ page: 1, limit: 100 })
        .then((r) => r.data as PaginatedResult<Restaurant>),
  });

  // Online kuryeler (satır içi "Kuryeye At" dropdown'ı için)
  const { data: onlineCouriersData } = useQuery({
    queryKey: ['couriers', 'online-for-inline-assign'],
    queryFn: () =>
      couriersApi
        .getAll({ page: 1, limit: 100, isOnline: true })
        .then((r) => r.data as PaginatedResult<Courier>),
  });

  // ─── Mutation'lar ───────────────────────────────────────────────────────────
  const autoAssignMutation = useMutation({
    mutationFn: (orderId: string) => ordersApi.assign(orderId),
    onSuccess: (res) => {
      const data = res.data;
      setAutoResult({
        assignedCourier: data.assignedCourier,
        scores: data.scores,
        message: data.message,
      });
      toast.success(
        `Sipariş #${data.order.orderNumber} → ${data.assignedCourier.user?.fullName ?? 'Kurye'}`,
      );
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message ?? 'Otomatik atama başarısız'),
  });

  const manualAssignMutation = useMutation({
    mutationFn: ({ orderId, courierId }: { orderId: string; courierId: string }) =>
      ordersApi.updateStatus(orderId, { status: 'assigned', courierId }),
    onSuccess: () => {
      toast.success('Kurye başarıyla atandı');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setAssignOrder(null);
      setAutoResult(null);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message ?? 'Manuel atama başarısız'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      ordersApi.updateStatus(orderId, { status }),
    onSuccess: () => {
      toast.success('Durum güncellendi');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setStatusOrder(null);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message ?? 'Durum güncellenemedi'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ordersApi.delete(id),
    onSuccess: () => {
      toast.success('Sipariş silindi');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setDeleteOrder(null);
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message ?? 'Silme başarısız'),
  });

  // ─── Filtrelenmiş siparişler ────────────────────────────────────────────────
  const orders = useMemo(() => {
    const all = data?.data ?? [];
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999);

    return all.filter((o) => {
      // Status filter
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;

      // Date range
      if (fromDate || toDate) {
        const created = new Date(o.createdAt);
        if (fromDate && created < fromDate) return false;
        if (toDate && created > toDate) return false;
      }

      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesNum = String(o.orderNumber).includes(q);
        const matchesCust = o.customerName.toLowerCase().includes(q);
        const matchesPhone = o.customerPhone.toLowerCase().includes(q);
        const matchesAddr = o.deliveryAddress.toLowerCase().includes(q);
        if (!matchesNum && !matchesCust && !matchesPhone && !matchesAddr) {
          return false;
        }
      }

      return true;
    });
  }, [data, statusFilter, dateFrom, dateTo, search]);

  const meta = data?.meta;
  const restaurants = restaurantsData?.data ?? [];
  const onlineCouriers = onlineCouriersData?.data ?? [];

  // ─── Filtre sıfırlama ───────────────────────────────────────────────────────
  const hasActiveFilter =
    statusFilter !== 'all' ||
    restaurantFilter !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    search !== '';

  const resetFilters = () => {
    setStatusFilter('all');
    setRestaurantFilter('all');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setPage(1);
  };

  // ─── İşlem handler'ları ─────────────────────────────────────────────────────
  const handleOpenAssign = (order: Order) => {
    setAutoResult(null);
    setAssignOrder(order);
  };

  const handleAutoAssign = () => {
    if (!assignOrder) return;
    autoAssignMutation.mutate(assignOrder.id);
  };

  const handleManualAssign = (courierId: string) => {
    if (!assignOrder) return;
    manualAssignMutation.mutate({ orderId: assignOrder.id, courierId });
  };

  const handleShowMapFromDetail = () => {
    if (!detailOrder) return;
    setMapOrder(detailOrder);
    setDetailOrder(null);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Siparişler</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {meta?.total ?? 0} toplam sipariş • {orders.length} görüntüleniyor
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <MdRefresh className={isRefetching ? 'animate-spin' : ''} />
          Yenile
        </button>
      </div>

      {/* Status filter chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((f) => {
          const count =
            f.value === 'all'
              ? data?.data.length ?? 0
              : (data?.data ?? []).filter((o) => o.status === f.value).length;
          const active = statusFilter === f.value;

          return (
            <button
              key={f.value}
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
              className={`flex-shrink-0 inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all ${
                active
                  ? 'bg-gray-900 text-white shadow-md'
                  : `${f.color} hover:opacity-80`
              }`}
            >
              {f.label}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  active ? 'bg-white/20' : 'bg-white/60'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter row */}
      <Card className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          {/* Search */}
          <div className="lg:col-span-4">
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              Arama
            </label>
            <div className="relative">
              <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
              <input
                type="text"
                placeholder="Sipariş no, müşteri, telefon, adres..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Restaurant select */}
          <div className="lg:col-span-3">
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              <MdRestaurant className="inline mr-1 text-sm" />
              Restoran
            </label>
            <select
              value={restaurantFilter}
              onChange={(e) => {
                setRestaurantFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tüm Restoranlar</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date from */}
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              <MdCalendarToday className="inline mr-1 text-sm" />
              Başlangıç
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Date to */}
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
              Bitiş
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Reset */}
          <div className="lg:col-span-1">
            <button
              onClick={resetFilters}
              disabled={!hasActiveFilter}
              className="w-full px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg border border-gray-200 transition-colors flex items-center justify-center gap-1"
            >
              <MdFilterList className="text-sm" />
              Temizle
            </button>
          </div>
        </div>
      </Card>

      {/* Tablo */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={8} columns={8} />
        ) : (
          <>
            {/* Mobile: kart görünümü */}
            <div className="md:hidden divide-y divide-gray-100">
              {orders.map((order) => (
                <div key={order.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono font-semibold text-gray-800 text-sm">#{order.orderNumber}</p>
                      <p className="text-xs text-gray-400">{formatRelativeTime(order.createdAt)}</p>
                    </div>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${ORDER_STATUS_COLORS[order.status]}`}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{order.customerName}</p>
                      <p className="text-xs text-gray-400 truncate">{order.customerPhone}</p>
                    </div>
                    <p className="font-semibold text-gray-800 flex-shrink-0">{formatCurrency(order.orderTotal)}</p>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{order.restaurant?.name ?? '—'}</p>
                  <p className="text-xs text-gray-500 line-clamp-1">{order.deliveryAddress}</p>
                  {order.courier && (
                    <p className="text-xs text-indigo-600 font-medium">🛵 {order.courier.user?.fullName}</p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <button onClick={() => setDetailOrder(order)} className="p-1.5 text-gray-600 hover:bg-indigo-50 rounded-lg" title="Detay">
                      <MdVisibility className="text-base" />
                    </button>
                    {order.status === 'pending' && (
                      <>
                        <button onClick={() => { setAutoResult(null); setAssignOrder(order); }} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg" title="Kurye Ata">
                          <MdAutoAwesome className="text-base" />
                        </button>
                        <button onClick={() => setDeleteOrder(order)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Sil">
                          <MdDelete className="text-base" />
                        </button>
                      </>
                    )}
                    {order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <button onClick={() => setStatusOrder(order)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Durum Güncelle">
                        <MdSwapHoriz className="text-base" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {orders.length === 0 && (
                <div className="py-16 text-center">
                  <MdReceiptLong className="mx-auto text-5xl text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-700">Sipariş bulunamadı</p>
                </div>
              )}
            </div>

            {/* Desktop: tablo */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {[
                      'Sipariş',
                      'Restoran',
                      'Müşteri',
                      'Adres',
                      'Kurye',
                      'Tutar',
                      'Durum',
                      'Hızlı İşlem',
                      'İşlemler',
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
                  {orders.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      couriers={onlineCouriers}
                      isAssigning={
                        manualAssignMutation.isPending &&
                        manualAssignMutation.variables?.orderId === order.id
                      }
                      isProgressing={
                        updateStatusMutation.isPending &&
                        updateStatusMutation.variables?.orderId === order.id
                      }
                      onDetail={() => setDetailOrder(order)}
                      onAssign={() => handleOpenAssign(order)}
                      onUpdateStatus={() => setStatusOrder(order)}
                      onDelete={() => setDeleteOrder(order)}
                      onAutoAssign={() => {
                        setAutoResult(null);
                        setAssignOrder(order);
                      }}
                      onQuickAssignCourier={(courierId) =>
                        manualAssignMutation.mutate({
                          orderId: order.id,
                          courierId,
                        })
                      }
                      onProgressStatus={(nextStatus) =>
                        updateStatusMutation.mutate({
                          orderId: order.id,
                          status: nextStatus,
                        })
                      }
                    />
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-16">
                        <MdReceiptLong className="mx-auto text-5xl text-gray-300 mb-3" />
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Sipariş bulunamadı
                        </p>
                        <p className="text-xs text-gray-500">
                          {hasActiveFilter
                            ? 'Filtre kriterlerinize uygun sipariş yok.'
                            : 'Henüz hiç sipariş oluşturulmamış.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/30">
                <p className="text-xs text-gray-500">
                  Sayfa <span className="font-semibold">{meta.page}</span> /{' '}
                  {meta.totalPages} • Toplam{' '}
                  <span className="font-semibold">{meta.total}</span> sipariş
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
                  >
                    Önceki
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= meta.totalPages}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            )}
          </>
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

      <UpdateStatusModal
        isOpen={!!statusOrder}
        order={statusOrder}
        isSubmitting={updateStatusMutation.isPending}
        onClose={() => setStatusOrder(null)}
        onSubmit={(newStatus) =>
          statusOrder &&
          updateStatusMutation.mutate({
            orderId: statusOrder.id,
            status: newStatus,
          })
        }
      />

      <AssignCourierModal
        isOpen={!!assignOrder}
        order={assignOrder}
        autoResult={autoResult}
        isManualSubmitting={manualAssignMutation.isPending}
        isAutoAssigning={autoAssignMutation.isPending}
        onClose={() => {
          setAssignOrder(null);
          setAutoResult(null);
        }}
        onManualAssign={handleManualAssign}
        onAutoAssign={handleAutoAssign}
        onResetAutoResult={() => setAutoResult(null)}
      />

      <ConfirmDialog
        isOpen={!!deleteOrder}
        title="Siparişi Sil"
        message={
          deleteOrder
            ? `Sipariş #${deleteOrder.orderNumber} silinecek. Bu işlem geri alınamaz.`
            : ''
        }
        confirmLabel="Sil"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onCancel={() => setDeleteOrder(null)}
        onConfirm={() => deleteOrder && deleteMutation.mutate(deleteOrder.id)}
      />
    </div>
  );
}

// ─── Order Row ───────────────────────────────────────────────────────────────

interface OrderRowProps {
  order: Order;
  couriers: Courier[];
  isAssigning: boolean;
  isProgressing: boolean;
  onDetail: () => void;
  onAssign: () => void;
  onUpdateStatus: () => void;
  onDelete: () => void;
  onAutoAssign: () => void;
  onQuickAssignCourier: (courierId: string) => void;
  onProgressStatus: (nextStatus: OrderStatus) => void;
}

function OrderRow({
  order,
  couriers,
  isAssigning,
  isProgressing,
  onDetail,
  onAssign,
  onUpdateStatus,
  onDelete,
  onAutoAssign,
  onQuickAssignCourier,
  onProgressStatus,
}: OrderRowProps) {
  const isPending = order.status === 'pending';
  const isFinal = order.status === 'delivered' || order.status === 'cancelled';
  const [selectedCourierId, setSelectedCourierId] = useState('');

  return (
    <tr className="hover:bg-gray-50/70 transition-colors">
      {/* Sipariş No */}
      <td className="px-4 py-3">
        <p className="font-mono text-sm font-semibold text-gray-800">
          #{order.orderNumber}
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          {formatRelativeTime(order.createdAt)}
        </p>
      </td>

      {/* Restoran */}
      <td className="px-4 py-3 text-gray-700 max-w-[180px]">
        <p className="font-medium truncate">{order.restaurant?.name ?? '—'}</p>
      </td>

      {/* Müşteri */}
      <td className="px-4 py-3 max-w-[160px]">
        <p className="font-medium text-gray-900 truncate">{order.customerName}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">
          {order.customerPhone}
        </p>
      </td>

      {/* Adres */}
      <td className="px-4 py-3 max-w-[220px]">
        <p className="text-xs text-gray-600 line-clamp-2 leading-snug">
          {order.deliveryAddress}
        </p>
      </td>

      {/* Kurye */}
      <td className="px-4 py-3 max-w-[160px]">
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
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  Online
                </p>
              )}
            </div>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full border border-yellow-200">
            <MdPending className="text-sm" />
            Atama Bekliyor
          </span>
        )}
      </td>

      {/* Tutar */}
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

      {/* Durum */}
      <td className="px-4 py-3">
        <span
          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[order.status]}`}
        >
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </td>

      {/* Hızlı İşlem (durum geçişi + kurye atama) */}
      <td className="px-4 py-3">
        {order.status === 'pending' && (
          <div className="flex items-center gap-1.5">
            <select
              value={selectedCourierId}
              onChange={(e) => setSelectedCourierId(e.target.value)}
              disabled={isAssigning || couriers.length === 0}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 max-w-[140px]"
            >
              <option value="">
                {couriers.length === 0 ? 'Online kurye yok' : 'Kurye seç...'}
              </option>
              {couriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.user?.fullName ?? 'İsimsiz'}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                selectedCourierId && onQuickAssignCourier(selectedCourierId)
              }
              disabled={!selectedCourierId || isAssigning}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isAssigning ? (
                <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <MdLocalShipping className="text-sm" />
              )}
              Kuryeye At
            </button>
          </div>
        )}

        {order.status === 'assigned' && (
          <button
            type="button"
            onClick={() => onProgressStatus('picked_up')}
            disabled={isProgressing}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isProgressing ? (
              <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <MdSwapHoriz className="text-sm" />
            )}
            Yolda
          </button>
        )}

        {order.status === 'picked_up' && (
          <button
            type="button"
            onClick={() => onProgressStatus('delivered')}
            disabled={isProgressing}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isProgressing ? (
              <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <MdSwapHoriz className="text-sm" />
            )}
            Teslim Edildi
          </button>
        )}

        {order.status === 'delivered' && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700">
            ✅ Teslim
          </span>
        )}

        {order.status === 'cancelled' && (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>

      {/* İşlemler */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-0.5">
          <ActionButton
            onClick={onDetail}
            title="Detay"
            icon={<MdVisibility />}
            color="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50"
          />

          {isPending && (
            <ActionButton
              onClick={onAutoAssign}
              title="Otomatik Kurye Ata"
              icon={<MdAutoAwesome />}
              color="text-purple-600 hover:bg-purple-50"
            />
          )}

          {isPending && (
            <ActionButton
              onClick={onAssign}
              title="Kurye Ata (Manuel)"
              icon={<MdLocalShipping />}
              color="text-indigo-600 hover:bg-indigo-50"
            />
          )}

          {!isFinal && (
            <ActionButton
              onClick={onUpdateStatus}
              title="Durumu Güncelle"
              icon={<MdSwapHoriz />}
              color="text-blue-600 hover:bg-blue-50"
            />
          )}

          {isPending && (
            <ActionButton
              onClick={onDelete}
              title="Sil"
              icon={<MdDelete />}
              color="text-red-500 hover:bg-red-50"
            />
          )}
        </div>
      </td>
    </tr>
  );
}

interface ActionButtonProps {
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
  color: string;
}

function ActionButton({ onClick, title, icon, color }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg transition-colors ${color}`}
    >
      <span className="text-base block">{icon}</span>
    </button>
  );
}
