import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdSearch,
  MdStar,
  MdStarHalf,
  MdStarBorder,
  MdMyLocation,
  MdPhone,
  MdDeliveryDining,
  MdDirectionsBike,
  MdDirectionsCar,
  MdTwoWheeler,
} from 'react-icons/md';
import { couriersApi } from '../../services/api';
import type { Courier, PaginatedResult, VehicleType } from '../../types';
import Card from '../../components/common/Card';
import { SkeletonTable } from '../../components/common/Skeleton';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { VEHICLE_LABELS } from '../../utils/helpers';
import CourierModal, { type CourierFormData } from './CourierModal';
import CourierMapModal from './CourierMapModal';
import CredentialsModal, { type NewCourierCredentials } from './CredentialsModal';

const PAGE_SIZE = 20;

type OnlineFilter = 'all' | 'online' | 'offline';
type VehicleFilter = 'all' | VehicleType;

export default function Couriers() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [onlineFilter, setOnlineFilter] = useState<OnlineFilter>('all');
  const [vehicleFilter, setVehicleFilter] = useState<VehicleFilter>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [mapTarget, setMapTarget] = useState<Courier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Courier | null>(null);
  const [credentials, setCredentials] = useState<NewCourierCredentials | null>(null);

  // ─── Veri çekme ─────────────────────────────────────────────────────────────
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['couriers', page, onlineFilter],
    queryFn: () =>
      couriersApi
        .getAll({
          page,
          limit: PAGE_SIZE,
          ...(onlineFilter !== 'all' ? { isOnline: onlineFilter === 'online' } : {}),
        })
        .then((r) => r.data as PaginatedResult<Courier>),
  });

  const meta = data?.meta;
  const allCouriers = data?.data ?? [];

  // ─── Filtreleme (istemci tarafı: arama + araç tipi) ─────────────────────────
  const filteredCouriers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCouriers.filter((c) => {
      const matchesSearch =
        !q ||
        c.user?.fullName?.toLowerCase().includes(q) ||
        c.user?.email?.toLowerCase().includes(q) ||
        c.user?.phone?.toLowerCase().includes(q);
      const matchesVehicle = vehicleFilter === 'all' || c.vehicleType === vehicleFilter;
      return matchesSearch && matchesVehicle;
    });
  }, [allCouriers, search, vehicleFilter]);

  // ─── Mutasyonlar ────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: {
      email: string;
      fullName: string;
      password: string;
      phone?: string;
      vehicleType?: string;
      latitude?: number | null;
      longitude?: number | null;
    }) => couriersApi.createWithUser(payload).then((r) => r.data),
    onSuccess: (_data, variables) => {
      toast.success('Kurye başarıyla oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      // Modal'ı kapat, credentials modal'ı aç
      setModalOpen(false);
      setEditingCourier(null);
      setCredentials({
        fullName: variables.fullName,
        email: variables.email,
        password: variables.password,
      });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Kurye oluşturulamadı');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Courier> }) =>
      couriersApi.update(id, data),
    onSuccess: () => {
      toast.success('Kurye güncellendi');
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
      closeModal();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Güncelleme başarısız');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isOnline }: { id: string; isOnline: boolean }) =>
      couriersApi.updateStatus(id, isOnline),
    onMutate: async ({ id, isOnline }) => {
      await queryClient.cancelQueries({ queryKey: ['couriers', page, onlineFilter] });
      const previous = queryClient.getQueryData<PaginatedResult<Courier>>([
        'couriers',
        page,
        onlineFilter,
      ]);
      if (previous) {
        queryClient.setQueryData<PaginatedResult<Courier>>(
          ['couriers', page, onlineFilter],
          {
            ...previous,
            data: previous.data.map((c) => (c.id === id ? { ...c, isOnline } : c)),
          },
        );
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['couriers', page, onlineFilter], ctx.previous);
      }
      toast.error('Durum güncellenemedi');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['couriers'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => couriersApi.delete(id),
    onSuccess: () => {
      toast.success('Kurye silindi');
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
      setDeleteTarget(null);
    },
    onError: () => toast.error('Silme işlemi başarısız'),
  });

  // ─── Eylem tetikleyiciler ────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingCourier(null);
    setModalOpen(true);
  };

  const openEdit = (c: Courier) => {
    setEditingCourier(c);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (createMutation.isPending || updateMutation.isPending) return;
    setModalOpen(false);
    setEditingCourier(null);
  };

  const handleSubmit = (form: CourierFormData) => {
    if (editingCourier) {
      // Edit modunda sadece kurye profili alanları gönderilir
      const updatePayload: Partial<Courier> = {
        vehicleType: form.vehicleType,
        latitude: form.latitude ?? undefined,
        longitude: form.longitude ?? undefined,
        isOnline: form.isOnline,
      };
      updateMutation.mutate({ id: editingCourier.id, data: updatePayload });
      return;
    }

    // Create modunda User + Courier birlikte oluşturulur
    if (!form.email || !form.fullName || !form.password) {
      toast.error('Email, ad soyad ve şifre zorunludur');
      return;
    }
    createMutation.mutate({
      email: form.email,
      fullName: form.fullName,
      password: form.password,
      phone: form.phone,
      vehicleType: form.vehicleType,
      latitude: form.latitude ?? null,
      longitude: form.longitude ?? null,
    });
  };

  const confirmDelete = () => {
    if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Kuryeler</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {meta?.total ?? 0} kurye kayıtlı
            {isFetching && !isLoading && (
              <span className="ml-2 text-indigo-500 text-xs">• Güncelleniyor</span>
            )}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <MdAdd className="text-base" />
          Yeni Kurye
        </button>
      </div>

      {/* Filtreler */}
      <Card className="px-4 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Arama */}
          <div className="relative flex-1">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
            <input
              type="text"
              placeholder="Ad, e-posta veya telefon ile ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
            />
          </div>

          {/* Online/Offline tabları */}
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            {(['all', 'online', 'offline'] as const).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setOnlineFilter(f);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  onlineFilter === f
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {f === 'all' && 'Tümü'}
                {f === 'online' && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Çevrimiçi
                  </span>
                )}
                {f === 'offline' && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                    Çevrimdışı
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Araç tipi dropdown */}
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value as VehicleFilter)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-[140px]"
          >
            <option value="all">Tüm Araçlar</option>
            <option value="bike">🚲 Bisiklet</option>
            <option value="motorbike">🛵 Motor</option>
            <option value="car">🚗 Araba</option>
          </select>
        </div>
      </Card>

      {/* Tablo */}
      <Card>
        {isLoading ? (
          <SkeletonTable rows={6} columns={7} />
        ) : (
          <>
            {/* Mobile: kart görünümü */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredCouriers.map((c) => (
                <div key={c.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                        {getInitials(c.user?.fullName ?? '?')}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{c.user?.fullName ?? '—'}</p>
                        <p className="text-xs text-gray-400 truncate">{c.user?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => setMapTarget(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <MdMyLocation className="text-base" />
                      </button>
                      <button onClick={() => openEdit(c)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                        <MdEdit className="text-base" />
                      </button>
                      <button onClick={() => setDeleteTarget(c)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                        <MdDelete className="text-base" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <VehicleBadge type={c.vehicleType} />
                    <StatusToggle
                      isOnline={c.isOnline}
                      disabled={statusMutation.isPending}
                      onChange={() => statusMutation.mutate({ id: c.id, isOnline: !c.isOnline })}
                    />
                    <RatingStars rating={Number(c.rating ?? 0)} />
                  </div>
                  {c.user?.phone && (
                    <a href={`tel:${c.user.phone}`} className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MdPhone className="text-gray-400" />
                      {c.user.phone}
                    </a>
                  )}
                </div>
              ))}
              {filteredCouriers.length === 0 && (
                <div className="py-12 text-center text-gray-400">
                  <MdDeliveryDining className="mx-auto text-4xl text-gray-300 mb-2" />
                  <p className="text-sm">{search || vehicleFilter !== 'all' || onlineFilter !== 'all' ? 'Filtreyle eşleşen kurye bulunamadı' : 'Henüz kurye yok'}</p>
                </div>
              )}
            </div>

            {/* Desktop: tablo */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {[
                      'Kurye',
                      'Telefon',
                      'Araç',
                      'Durum',
                      'Aktif Sipariş',
                      'Rating',
                      'İşlemler',
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredCouriers.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* İsim + email */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                            {getInitials(c.user?.fullName ?? '?')}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {c.user?.fullName ?? '—'}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {c.user?.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Telefon */}
                      <td className="px-5 py-3.5">
                        {c.user?.phone ? (
                          <a
                            href={`tel:${c.user.phone}`}
                            className="flex items-center gap-1.5 text-gray-600 hover:text-indigo-600 text-sm"
                          >
                            <MdPhone className="text-gray-400 text-base" />
                            {c.user.phone}
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Araç */}
                      <td className="px-5 py-3.5">
                        <VehicleBadge type={c.vehicleType} />
                      </td>

                      {/* Durum (yeşil/kırmızı) */}
                      <td className="px-5 py-3.5">
                        <StatusToggle
                          isOnline={c.isOnline}
                          disabled={statusMutation.isPending}
                          onChange={() =>
                            statusMutation.mutate({ id: c.id, isOnline: !c.isOnline })
                          }
                        />
                      </td>

                      {/* Aktif sipariş */}
                      <td className="px-5 py-3.5">
                        <ActiveOrdersBadge count={c.currentOrders} />
                      </td>

                      {/* Rating */}
                      <td className="px-5 py-3.5">
                        <RatingStars rating={Number(c.rating ?? 0)} />
                      </td>

                      {/* İşlemler */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setMapTarget(c)}
                            title="Konumu göster"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <MdMyLocation className="text-base" />
                          </button>
                          <button
                            onClick={() => openEdit(c)}
                            title="Düzenle"
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <MdEdit className="text-base" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(c)}
                            title="Sil"
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <MdDelete className="text-base" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredCouriers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400">
                        <MdDeliveryDining className="mx-auto text-4xl text-gray-300 mb-2" />
                        <p className="text-sm">
                          {search || vehicleFilter !== 'all' || onlineFilter !== 'all'
                            ? 'Filtreyle eşleşen kurye bulunamadı'
                            : 'Henüz kurye yok'}
                        </p>
                        {!search && vehicleFilter === 'all' && onlineFilter === 'all' && (
                          <button
                            onClick={openCreate}
                            className="mt-3 inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                          >
                            <MdAdd /> İlk kuryeyi ekleyin
                          </button>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Sayfa <span className="font-semibold text-gray-700">{meta.page}</span> /{' '}
                  {meta.totalPages}
                  <span className="ml-2 text-gray-400">(toplam {meta.total} kayıt)</span>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Önceki
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= meta.totalPages}
                    className="px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Sonraki →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Modal: Yeni / Düzenle */}
      <CourierModal
        isOpen={modalOpen}
        mode={editingCourier ? 'edit' : 'create'}
        courier={editingCourier}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      {/* Modal: Harita */}
      <CourierMapModal
        isOpen={!!mapTarget}
        courier={mapTarget}
        onClose={() => setMapTarget(null)}
      />

      {/* Modal: Yeni eklenen kurye giriş bilgileri */}
      <CredentialsModal
        isOpen={!!credentials}
        credentials={credentials}
        onClose={() => setCredentials(null)}
      />

      {/* Silme onayı */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Kuryeyi sil?"
        message={
          deleteTarget
            ? `"${deleteTarget.user?.fullName ?? 'Kurye'}" kaydını silmek üzeresiniz. Bu işlem geri alınamaz ve kuryeyle ilişkili sipariş atamaları etkilenebilir.`
            : ''
        }
        variant="danger"
        confirmLabel="Evet, sil"
        cancelLabel="Vazgeç"
        isLoading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => !deleteMutation.isPending && setDeleteTarget(null)}
      />
    </div>
  );
}

// ─── Yardımcı bileşenler ─────────────────────────────────────────────────────

function getInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

interface StatusToggleProps {
  isOnline: boolean;
  disabled?: boolean;
  onChange: () => void;
}

function StatusToggle({ isOnline, disabled, onChange }: StatusToggleProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      title={isOnline ? 'Çevrimdışı yap' : 'Çevrimiçi yap'}
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        isOnline
          ? 'bg-green-100 text-green-800 hover:bg-green-200'
          : 'bg-red-100 text-red-700 hover:bg-red-200'
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        }`}
      />
      {isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
    </button>
  );
}

function VehicleBadge({ type }: { type: VehicleType }) {
  const config: Record<VehicleType, { icon: React.ReactNode; bg: string; text: string }> = {
    bike: {
      icon: <MdDirectionsBike />,
      bg: 'bg-blue-50',
      text: 'text-blue-700',
    },
    motorbike: {
      icon: <MdTwoWheeler />,
      bg: 'bg-orange-50',
      text: 'text-orange-700',
    },
    car: {
      icon: <MdDirectionsCar />,
      bg: 'bg-purple-50',
      text: 'text-purple-700',
    },
  };
  const c = config[type] ?? config.motorbike;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${c.bg} ${c.text}`}
    >
      <span className="text-base">{c.icon}</span>
      {VEHICLE_LABELS[type] ?? type}
    </span>
  );
}

function ActiveOrdersBadge({ count }: { count: number }) {
  if (count === 0) {
    return <span className="text-gray-400 text-sm">—</span>;
  }
  return (
    <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
      {count}
    </span>
  );
}

function RatingStars({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, rating));
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (r >= i) {
      stars.push(<MdStar key={i} className="text-yellow-400" />);
    } else if (r >= i - 0.5) {
      stars.push(<MdStarHalf key={i} className="text-yellow-400" />);
    } else {
      stars.push(<MdStarBorder key={i} className="text-gray-300" />);
    }
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex text-base">{stars}</div>
      <span className="text-xs font-medium text-gray-600">{r.toFixed(1)}</span>
    </div>
  );
}
