import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdSearch,
  MdStorefront,
  MdPhone,
  MdLocationOn,
} from 'react-icons/md';
import { restaurantsApi } from '../../services/api';
import type { Restaurant, PaginatedResult } from '../../types';
import Card from '../../components/common/Card';
import { SkeletonTable } from '../../components/common/Skeleton';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { formatDate } from '../../utils/helpers';
import RestaurantModal, { type RestaurantFormData } from './RestaurantModal';

const PAGE_SIZE = 20;

export default function Restaurants() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Modal & dialog state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Restaurant | null>(null);

  // ─── Veri çekme ─────────────────────────────────────────────────────────────
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['restaurants', page],
    queryFn: () =>
      restaurantsApi
        .getAll({ page, limit: PAGE_SIZE })
        .then((r) => r.data as PaginatedResult<Restaurant>),
  });

  const meta = data?.meta;
  const allRestaurants = data?.data ?? [];

  // İstemci tarafı arama: ad, adres, telefon
  const filteredRestaurants = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRestaurants;
    return allRestaurants.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q) ||
        (r.phone ?? '').toLowerCase().includes(q),
    );
  }, [allRestaurants, search]);

  // ─── Mutasyonlar ────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: RestaurantFormData) => restaurantsApi.create(payload),
    onSuccess: () => {
      toast.success('Restoran başarıyla oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      setModalOpen(false);
      setEditingRestaurant(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Restoran oluşturulamadı');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Restaurant> }) =>
      restaurantsApi.update(id, data),
    onSuccess: () => {
      toast.success('Restoran güncellendi');
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      setModalOpen(false);
      setEditingRestaurant(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Güncelleme başarısız');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      restaurantsApi.update(id, { isActive }),
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ['restaurants', page] });
      const previous = queryClient.getQueryData<PaginatedResult<Restaurant>>([
        'restaurants',
        page,
      ]);
      if (previous) {
        queryClient.setQueryData<PaginatedResult<Restaurant>>(['restaurants', page], {
          ...previous,
          data: previous.data.map((r) => (r.id === id ? { ...r, isActive } : r)),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['restaurants', page], ctx.previous);
      }
      toast.error('Durum değiştirilemedi');
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.isActive ? 'Restoran aktif edildi' : 'Restoran pasif edildi');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => restaurantsApi.delete(id),
    onSuccess: () => {
      toast.success('Restoran silindi');
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Silme işlemi başarısız');
    },
  });

  // ─── Eylem Tetikleyiciler ────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingRestaurant(null);
    setModalOpen(true);
  };

  const openEdit = (r: Restaurant) => {
    setEditingRestaurant(r);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (createMutation.isPending || updateMutation.isPending) return;
    setModalOpen(false);
    setEditingRestaurant(null);
  };

  const handleSubmit = (form: RestaurantFormData) => {
    if (editingRestaurant) {
      const { userId: _omit, ...rest } = form;
      updateMutation.mutate({ id: editingRestaurant.id, data: rest as Partial<Restaurant> });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleToggleStatus = (r: Restaurant) => {
    toggleStatusMutation.mutate({ id: r.id, isActive: !r.isActive });
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
          <h2 className="text-xl font-bold text-gray-800">Restoranlar</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {meta?.total ?? 0} restoran kayıtlı
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
          Yeni Restoran
        </button>
      </div>

      {/* Search */}
      <Card className="px-4 py-3">
        <div className="relative">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
          <input
            type="text"
            placeholder="Restoran adı, adres veya telefon ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
          />
        </div>
      </Card>

      {/* Tablo */}
      <Card>
        {isLoading ? (
          <SkeletonTable rows={6} columns={6} />
        ) : (
          <>
            {/* Mobile: kart görünümü */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredRestaurants.map((r) => (
                <div key={r.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                        {getInitials(r.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{r.name}</p>
                        {r.user?.email && (
                          <p className="text-xs text-gray-400 truncate">{r.user.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(r)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                        <MdEdit className="text-base" />
                      </button>
                      <button onClick={() => setDeleteTarget(r)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                        <MdDelete className="text-base" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 flex items-start gap-1">
                    <MdLocationOn className="flex-shrink-0 mt-0.5" />
                    {r.address}
                  </p>
                  <div className="flex items-center justify-between">
                    {r.phone && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <MdPhone className="flex-shrink-0" />
                        {r.phone}
                      </p>
                    )}
                    <StatusToggle
                      isActive={r.isActive}
                      disabled={toggleStatusMutation.isPending}
                      onChange={() => handleToggleStatus(r)}
                    />
                  </div>
                </div>
              ))}
              {filteredRestaurants.length === 0 && (
                <div className="py-12 text-center text-gray-400">
                  <MdStorefront className="mx-auto text-4xl text-gray-300 mb-2" />
                  <p className="text-sm">{search ? 'Aramayla eşleşen restoran bulunamadı' : 'Henüz restoran yok'}</p>
                </div>
              )}
            </div>

            {/* Desktop: tablo */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Restoran', 'Adres', 'Telefon', 'Durum', 'Kayıt', 'İşlemler'].map((h) => (
                      <th
                        key={h}
                        className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredRestaurants.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Logo + İsim */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                            {getInitials(r.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{r.name}</p>
                            {r.user?.email && (
                              <p className="text-xs text-gray-400 truncate">{r.user.email}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Adres */}
                      <td className="px-5 py-3.5 max-w-xs">
                        <div className="flex items-start gap-1.5 text-gray-600">
                          <MdLocationOn className="text-gray-400 text-base flex-shrink-0 mt-0.5" />
                          <span className="truncate">{r.address}</span>
                        </div>
                      </td>

                      {/* Telefon */}
                      <td className="px-5 py-3.5">
                        {r.phone ? (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <MdPhone className="text-gray-400 text-base" />
                            <span>{r.phone}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Durum Toggle */}
                      <td className="px-5 py-3.5">
                        <StatusToggle
                          isActive={r.isActive}
                          disabled={toggleStatusMutation.isPending}
                          onChange={() => handleToggleStatus(r)}
                        />
                      </td>

                      {/* Kayıt tarihi */}
                      <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                        {formatDate(r.createdAt)}
                      </td>

                      {/* İşlemler */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(r)}
                            title="Düzenle"
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <MdEdit className="text-base" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(r)}
                            title="Sil"
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <MdDelete className="text-base" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredRestaurants.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-400">
                        <MdStorefront className="mx-auto text-4xl text-gray-300 mb-2" />
                        <p className="text-sm">
                          {search ? 'Aramayla eşleşen restoran bulunamadı' : 'Henüz restoran yok'}
                        </p>
                        {!search && (
                          <button
                            onClick={openCreate}
                            className="mt-3 inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                          >
                            <MdAdd /> İlk restoranı ekleyin
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

      {/* Yeni / Düzenle Modal */}
      <RestaurantModal
        isOpen={modalOpen}
        mode={editingRestaurant ? 'edit' : 'create'}
        restaurant={editingRestaurant}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      {/* Silme Onay Dialogu */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Restoranı sil?"
        message={
          deleteTarget
            ? `"${deleteTarget.name}" restoranını silmek üzeresiniz. Bu işlem geri alınamaz ve restoranla ilişkili tüm siparişler etkilenebilir.`
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
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

interface StatusToggleProps {
  isActive: boolean;
  disabled?: boolean;
  onChange: () => void;
}

function StatusToggle({ isActive, disabled, onChange }: StatusToggleProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      title={isActive ? 'Pasif et' : 'Aktif et'}
      className={`group flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          isActive ? 'bg-green-500' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            isActive ? 'translate-x-[18px]' : 'translate-x-1'
          }`}
        />
      </span>
      <span
        className={`text-xs font-medium ${
          isActive ? 'text-green-700' : 'text-gray-500'
        }`}
      >
        {isActive ? 'Aktif' : 'Pasif'}
      </span>
    </button>
  );
}
