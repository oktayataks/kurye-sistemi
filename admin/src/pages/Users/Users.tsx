import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdSearch,
  MdManageAccounts,
  MdAdminPanelSettings,
  MdStorefront,
  MdDeliveryDining,
  MdEmail,
  MdPhone,
  MdCheckCircle,
  MdBlock,
} from 'react-icons/md';
import { usersApi } from '../../services/api';
import type { User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/common/Card';
import { SkeletonTable } from '../../components/common/Skeleton';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { formatDate } from '../../utils/helpers';
import UserModal, { type UserFormData } from './UserModal';

type RoleFilter = 'all' | 'admin' | 'restaurant' | 'courier';

const ROLE_FILTERS: { label: string; value: RoleFilter; icon: React.ElementType; color: string }[] = [
  { label: 'Tümü', value: 'all', icon: MdManageAccounts, color: 'bg-gray-100 text-gray-700' },
  { label: 'Admin', value: 'admin', icon: MdAdminPanelSettings, color: 'bg-purple-100 text-purple-700' },
  { label: 'Restoran', value: 'restaurant', icon: MdStorefront, color: 'bg-amber-100 text-amber-700' },
  { label: 'Kurye', value: 'courier', icon: MdDeliveryDining, color: 'bg-emerald-100 text-emerald-700' },
];

export default function Users() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  // Modal & dialog state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  // ─── Veri çekme ─────────────────────────────────────────────────────────────
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll().then((r) => r.data as User[]),
  });

  const allUsers = data ?? [];

  // İstemci tarafı filtre + arama
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allUsers.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone ?? '').toLowerCase().includes(q)
      );
    });
  }, [allUsers, search, roleFilter]);

  // Rollere göre sayım
  const counts = useMemo(() => {
    const result: Record<RoleFilter, number> = {
      all: allUsers.length,
      admin: 0,
      restaurant: 0,
      courier: 0,
    };
    for (const u of allUsers) {
      result[u.role] = (result[u.role] ?? 0) + 1;
    }
    return result;
  }, [allUsers]);

  // ─── Mutasyonlar ────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: UserFormData) =>
      usersApi.create(payload as Required<UserFormData>),
    onSuccess: () => {
      toast.success('Kullanıcı başarıyla oluşturuldu');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setModalOpen(false);
      setEditingUser(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Kullanıcı oluşturulamadı');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UserFormData> }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      toast.success('Kullanıcı güncellendi');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setModalOpen(false);
      setEditingUser(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Güncelleme başarısız');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      toast.success('Kullanıcı silindi');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(
        Array.isArray(msg)
          ? msg.join(', ')
          : msg ?? 'Silme başarısız (kullanıcı bağlı kayıtlara sahip olabilir)',
      );
    },
  });

  // ─── Eylemler ────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (createMutation.isPending || updateMutation.isPending) return;
    setModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = (form: UserFormData) => {
    if (editingUser) {
      // Edit modunda boş şifre gönderme
      const payload: Partial<UserFormData> = { ...form };
      if (!payload.password) delete payload.password;
      updateMutation.mutate({ id: editingUser.id, data: payload });
    } else {
      createMutation.mutate(form);
    }
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
          <h2 className="text-xl font-bold text-gray-800">Kullanıcı Yönetimi</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {counts.all} kullanıcı kayıtlı
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
          Yeni Kullanıcı
        </button>
      </div>

      {/* Filtre ve arama */}
      <Card className="px-4 py-3 space-y-3">
        {/* Rol filtresi chip'leri */}
        <div className="flex flex-wrap gap-2">
          {ROLE_FILTERS.map(({ label, value, icon: Icon, color }) => {
            const active = roleFilter === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setRoleFilter(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : `${color} hover:brightness-95`
                }`}
              >
                <Icon className="text-sm" />
                {label}
                <span
                  className={`ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold rounded-full px-1 ${
                    active ? 'bg-white/20 text-white' : 'bg-white/70 text-gray-700'
                  }`}
                >
                  {counts[value]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Arama kutusu */}
        <div className="relative">
          <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
          <input
            type="text"
            placeholder="İsim, e-posta veya telefon ile ara..."
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Kullanıcı', 'İletişim', 'Rol', 'Durum', 'Kayıt', 'İşlemler'].map((h) => (
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
                {filteredUsers.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Avatar + İsim */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                            {(u.fullName ?? '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-gray-900 truncate">
                                {u.fullName}
                              </p>
                              {isSelf && (
                                <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-wide">
                                  Siz
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* İletişim */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-1 text-xs text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <MdEmail className="text-gray-400 text-sm" />
                            <span className="truncate">{u.email}</span>
                          </div>
                          {u.phone ? (
                            <div className="flex items-center gap-1.5">
                              <MdPhone className="text-gray-400 text-sm" />
                              <span>{u.phone}</span>
                            </div>
                          ) : (
                            <div className="text-gray-300 text-xs italic">Telefon yok</div>
                          )}
                        </div>
                      </td>

                      {/* Rol */}
                      <td className="px-5 py-3.5">
                        <RoleBadge role={u.role} />
                      </td>

                      {/* Durum */}
                      <td className="px-5 py-3.5">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-md">
                            <MdCheckCircle className="text-sm" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                            <MdBlock className="text-sm" />
                            Pasif
                          </span>
                        )}
                      </td>

                      {/* Kayıt tarihi */}
                      <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                        {formatDate(u.createdAt)}
                      </td>

                      {/* İşlemler */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            title="Düzenle"
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <MdEdit className="text-base" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(u)}
                            disabled={isSelf}
                            title={isSelf ? 'Kendinizi silemezsiniz' : 'Sil'}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          >
                            <MdDelete className="text-base" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      <MdManageAccounts className="mx-auto text-4xl text-gray-300 mb-2" />
                      <p className="text-sm">
                        {search || roleFilter !== 'all'
                          ? 'Filtreyle eşleşen kullanıcı bulunamadı'
                          : 'Henüz kullanıcı yok'}
                      </p>
                      {!search && roleFilter === 'all' && (
                        <button
                          onClick={openCreate}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          <MdAdd /> İlk kullanıcıyı ekleyin
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal */}
      <UserModal
        isOpen={modalOpen}
        mode={editingUser ? 'edit' : 'create'}
        user={editingUser}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      {/* Silme onayı */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Kullanıcıyı Sil"
        message={`"${deleteTarget?.fullName}" adlı kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz. Bu kullanıcıya bağlı restoran/kurye kayıtları varsa silme başarısız olabilir.`}
        confirmLabel="Evet, Sil"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ─── Role Badge ──────────────────────────────────────────────────────────────

const ROLE_BADGE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; bg: string; text: string; border: string }
> = {
  admin: {
    label: 'Admin',
    icon: MdAdminPanelSettings,
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  restaurant: {
    label: 'Restoran',
    icon: MdStorefront,
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  courier: {
    label: 'Kurye',
    icon: MdDeliveryDining,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
};

function RoleBadge({ role }: { role: string }) {
  const config = ROLE_BADGE_CONFIG[role] ?? ROLE_BADGE_CONFIG.courier;
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}
    >
      <Icon className="text-sm" />
      {config.label}
    </span>
  );
}
