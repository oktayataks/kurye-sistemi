import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import {
  MdClose,
  MdDeliveryDining,
  MdPerson,
  MdEmail,
  MdLock,
  MdPhone,
  MdMyLocation,
  MdDirectionsBike,
  MdAutorenew,
  MdVisibility,
  MdVisibilityOff,
} from 'react-icons/md';
import type { Courier, PaginatedResult, User, VehicleType } from '../../types';
import { VEHICLE_LABELS } from '../../utils/helpers';
import { usersApi, couriersApi } from '../../services/api';

// ─── Form veri tipi ──────────────────────────────────────────────────────────

export interface CourierFormData {
  // Yeni kurye için (create modu)
  email?: string;
  fullName?: string;
  phone?: string;
  password?: string;
  autoPassword?: boolean;

  // Mevcut kullanıcı modu
  userId?: string;

  // Hem create hem edit modu
  vehicleType: VehicleType;
  latitude?: number | null;
  longitude?: number | null;
  isOnline?: boolean;
}

interface CourierModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  courier?: Courier | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (data: CourierFormData) => void;
}

const VEHICLE_OPTIONS: VehicleType[] = ['bike', 'motorbike', 'car'];

const EMPTY_FORM: CourierFormData = {
  email: '',
  fullName: '',
  phone: '',
  password: '',
  autoPassword: true,
  vehicleType: 'motorbike',
  latitude: null,
  longitude: null,
  isOnline: false,
};

// ─── 8 karakter rastgele şifre üretici ───────────────────────────────────────

export function generatePassword(length = 8): string {
  // Karışıklığı önlemek için 0/O/1/l/I çıkarıldı
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < length; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

export default function CourierModal({
  isOpen,
  mode,
  courier,
  isSubmitting = false,
  onClose,
  onSubmit,
}: CourierModalProps) {
  const isEdit = mode === 'edit';
  const [showPassword, setShowPassword] = useState(false);
  const [createMode, setCreateMode] = useState<'new' | 'existing'>('new');
  const [selectedUserId, setSelectedUserId] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CourierFormData>({
    defaultValues: EMPTY_FORM,
  });

  const isOnline = watch('isOnline');
  const autoPassword = watch('autoPassword');

  // Mevcut kullanıcı modunda: kurye kaydı olmayan kullanıcıları çek
  const { data: allUsers } = useQuery({
    queryKey: ['users-for-courier'],
    queryFn: () => usersApi.getAll().then((r) => r.data as User[]),
    enabled: isOpen && !isEdit && createMode === 'existing',
  });

  const { data: allCouriersData } = useQuery({
    queryKey: ['couriers-for-modal'],
    queryFn: () =>
      couriersApi.getAll({ limit: 200 }).then((r) => r.data as PaginatedResult<Courier>),
    enabled: isOpen && !isEdit && createMode === 'existing',
  });

  const courierUserIds = new Set(
    (allCouriersData?.data ?? []).map((c) => c.userId),
  );
  const availableUsers = (allUsers ?? []).filter(
    (u) => !courierUserIds.has(u.id),
  );

  useEffect(() => {
    if (!isOpen) return;
    setShowPassword(false);
    setCreateMode('new');
    setSelectedUserId('');
    if (isEdit && courier) {
      reset({
        vehicleType: courier.vehicleType,
        latitude: courier.latitude ?? null,
        longitude: courier.longitude ?? null,
        isOnline: courier.isOnline,
      });
    } else {
      reset(EMPTY_FORM);
    }
  }, [isOpen, isEdit, courier, reset]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleRegeneratePassword = () => {
    setValue('password', generatePassword(), { shouldValidate: true });
  };

  const submitHandler = (data: CourierFormData) => {
    const lat =
      data.latitude === null || data.latitude === undefined || isNaN(Number(data.latitude))
        ? null
        : Number(data.latitude);
    const lng =
      data.longitude === null ||
      data.longitude === undefined ||
      isNaN(Number(data.longitude))
        ? null
        : Number(data.longitude);

    if (isEdit) {
      onSubmit({
        vehicleType: data.vehicleType,
        latitude: lat,
        longitude: lng,
        isOnline: !!data.isOnline,
      });
      return;
    }

    // Mevcut kullanıcı modu
    if (createMode === 'existing') {
      if (!selectedUserId) return;
      onSubmit({
        userId: selectedUserId,
        vehicleType: data.vehicleType,
        latitude: lat,
        longitude: lng,
      });
      return;
    }

    // Yeni kullanıcı modu
    const finalPassword = data.autoPassword
      ? generatePassword()
      : (data.password ?? '').trim();

    onSubmit({
      email: data.email?.trim().toLowerCase(),
      fullName: data.fullName?.trim(),
      phone: data.phone?.trim() || undefined,
      password: finalPassword,
      autoPassword: data.autoPassword,
      vehicleType: data.vehicleType,
      latitude: lat,
      longitude: lng,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={() => !isSubmitting && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <MdDeliveryDining className="text-indigo-600 text-xl" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {isEdit ? 'Kuryeyi Düzenle' : 'Yeni Kurye Ekle'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {isEdit
                  ? courier?.user?.fullName ?? 'Kurye bilgilerini güncelleyin'
                  : 'Sisteme yeni bir kurye ve giriş hesabı tanımla'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors disabled:opacity-40"
          >
            <MdClose className="text-lg" />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit(submitHandler)}
          noValidate
          className="flex-1 overflow-y-auto"
        >
          <div className="p-6 space-y-4">
            {/* Create modu: Yeni / Mevcut toggle */}
            {!isEdit && (
              <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setCreateMode('new'); setSelectedUserId(''); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    createMode === 'new'
                      ? 'bg-white shadow-sm text-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  ➕ Yeni Kullanıcı
                </button>
                <button
                  type="button"
                  onClick={() => setCreateMode('existing')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    createMode === 'existing'
                      ? 'bg-white shadow-sm text-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  👤 Mevcut Kullanıcı
                </button>
              </div>
            )}

            {/* Mevcut kullanıcı modu */}
            {!isEdit && createMode === 'existing' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <MdPerson className="text-gray-400 text-lg" />
                  Kullanıcı Seç
                  <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  disabled={isSubmitting}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 disabled:bg-gray-50"
                >
                  <option value="">-- Kullanıcı seçin --</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.email})
                    </option>
                  ))}
                </select>
                {availableUsers.length === 0 && allUsers !== undefined && (
                  <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 px-2 py-1.5 rounded-lg">
                    Tüm kullanıcıların zaten kurye kaydı var.
                  </p>
                )}
                {!selectedUserId && (
                  <p className="text-xs text-gray-400 mt-1">
                    Sadece kurye kaydı olmayan kullanıcılar listeleniyor.
                  </p>
                )}
              </div>
            )}

            {/* Yeni kurye için kişisel bilgiler */}
            {!isEdit && createMode === 'new' && (
              <>
                {/* Ad Soyad */}
                <FormField
                  label="Ad Soyad"
                  required
                  icon={<MdPerson className="text-gray-400 text-lg" />}
                  error={errors.fullName?.message}
                >
                  <input
                    type="text"
                    placeholder="Örn: Ahmet Kara"
                    disabled={isSubmitting}
                    className={inputClass(!!errors.fullName)}
                    {...register('fullName', {
                      required: 'Ad soyad zorunludur',
                      minLength: { value: 2, message: 'En az 2 karakter olmalıdır' },
                      maxLength: { value: 100, message: 'En fazla 100 karakter olabilir' },
                    })}
                  />
                </FormField>

                {/* E-posta */}
                <FormField
                  label="E-posta"
                  required
                  icon={<MdEmail className="text-gray-400 text-lg" />}
                  error={errors.email?.message}
                  hint="Mobil uygulamada giriş için kullanılacak"
                >
                  <input
                    type="email"
                    placeholder="ornek@kurye.com"
                    disabled={isSubmitting}
                    autoComplete="off"
                    className={inputClass(!!errors.email)}
                    {...register('email', {
                      required: 'E-posta zorunludur',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Geçerli bir e-posta adresi girin',
                      },
                    })}
                  />
                </FormField>

                {/* Telefon */}
                <FormField
                  label="Telefon"
                  icon={<MdPhone className="text-gray-400 text-lg" />}
                  error={errors.phone?.message}
                >
                  <input
                    type="tel"
                    placeholder="05551234567"
                    disabled={isSubmitting}
                    className={inputClass(!!errors.phone)}
                    {...register('phone', {
                      pattern: {
                        value: /^[0-9+\s()-]{7,20}$/,
                        message: 'Geçerli bir telefon numarası girin',
                      },
                    })}
                  />
                </FormField>

                {/* Şifre seçenekleri */}
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      disabled={isSubmitting}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-2 focus:ring-indigo-300"
                      {...register('autoPassword')}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Otomatik şifre oluştur{' '}
                      <span className="text-xs text-indigo-600 font-normal">
                        (önerilen)
                      </span>
                    </span>
                  </label>

                  {autoPassword ? (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5 text-xs text-indigo-700 leading-relaxed flex items-start gap-2">
                      <span className="text-base leading-none mt-0.5">🔐</span>
                      <span>
                        Sistem 8 karakterlik güvenli bir şifre üretecek. Kayıt
                        oluştuktan sonra şifreyi açılan ekranda görüp kuryeye
                        iletebilirsiniz.
                      </span>
                    </div>
                  ) : (
                    <FormField
                      label="Şifre"
                      required
                      icon={<MdLock className="text-gray-400 text-lg" />}
                      error={errors.password?.message}
                      hint="Kurye bu şifre ile mobil uygulamaya giriş yapacak"
                    >
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="En az 6 karakter"
                          disabled={isSubmitting}
                          autoComplete="new-password"
                          className={`${inputClass(!!errors.password)} pr-20`}
                          {...register('password', {
                            required: autoPassword ? false : 'Şifre zorunludur',
                            minLength: {
                              value: 6,
                              message: 'Şifre en az 6 karakter olmalıdır',
                            },
                          })}
                        />
                        <div className="absolute inset-y-0 right-2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            tabIndex={-1}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title={showPassword ? 'Gizle' : 'Göster'}
                          >
                            {showPassword ? (
                              <MdVisibilityOff className="text-base" />
                            ) : (
                              <MdVisibility className="text-base" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={handleRegeneratePassword}
                            tabIndex={-1}
                            className="p-1.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors"
                            title="Yeni şifre üret"
                          >
                            <MdAutorenew className="text-base" />
                          </button>
                        </div>
                      </div>
                    </FormField>
                  )}
                </div>
              </>
            )}

            {/* Edit modunda kullanıcı bilgileri readonly gösterilir */}
            {isEdit && courier?.user && (
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-xs space-y-1">
                <div className="flex items-center gap-2 text-gray-600">
                  <MdPerson className="text-gray-400" />
                  <span className="font-medium">{courier.user.fullName}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <MdEmail className="text-gray-400" />
                  <span>{courier.user.email}</span>
                </div>
                {courier.user.phone && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <MdPhone className="text-gray-400" />
                    <span>{courier.user.phone}</span>
                  </div>
                )}
                <p className="text-[11px] text-gray-400 mt-1.5 italic">
                  Kullanıcı bilgilerini değiştirmek için Kullanıcı Yönetimi
                  sayfasını kullanın.
                </p>
              </div>
            )}

            {/* Araç tipi */}
            <FormField
              label="Araç Tipi"
              required
              icon={<MdDirectionsBike className="text-gray-400 text-lg" />}
              error={errors.vehicleType?.message}
            >
              <div className="grid grid-cols-3 gap-2">
                {VEHICLE_OPTIONS.map((v) => (
                  <VehicleOption
                    key={v}
                    value={v}
                    label={VEHICLE_LABELS[v] ?? v}
                    disabled={isSubmitting}
                    {...register('vehicleType', { required: true })}
                  />
                ))}
              </div>
            </FormField>

            {/* Konum */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <MdMyLocation className="text-gray-400" />
                Konum (Koordinat)
                <span className="text-xs text-gray-400 font-normal ml-1">
                  (opsiyonel)
                </span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="number"
                    step="any"
                    placeholder="Enlem (lat)"
                    disabled={isSubmitting}
                    className={inputClass(!!errors.latitude)}
                    {...register('latitude', {
                      valueAsNumber: true,
                      validate: (v) => {
                        if (v === null || v === undefined || isNaN(Number(v)))
                          return true;
                        const n = Number(v);
                        if (n < -90 || n > 90)
                          return 'Enlem -90 ile 90 arasında olmalıdır';
                        return true;
                      },
                    })}
                  />
                  {errors.latitude?.message && (
                    <p className="mt-1 text-xs text-red-600">
                      ⚠ {errors.latitude.message}
                    </p>
                  )}
                </div>
                <div>
                  <input
                    type="number"
                    step="any"
                    placeholder="Boylam (lng)"
                    disabled={isSubmitting}
                    className={inputClass(!!errors.longitude)}
                    {...register('longitude', {
                      valueAsNumber: true,
                      validate: (v) => {
                        if (v === null || v === undefined || isNaN(Number(v)))
                          return true;
                        const n = Number(v);
                        if (n < -180 || n > 180)
                          return 'Boylam -180 ile 180 arasında olmalıdır';
                        return true;
                      },
                    })}
                  />
                  {errors.longitude?.message && (
                    <p className="mt-1 text-xs text-red-600">
                      ⚠ {errors.longitude.message}
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Otomatik sipariş atama için konum kullanılır.
              </p>
            </div>

            {/* Online/Offline switch (sadece edit'te) */}
            {isEdit && (
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">Çevrimiçi Durum</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Kurye sipariş alabilsin mi?
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setValue('isOnline', !isOnline, { shouldDirty: true })}
                  disabled={isSubmitting}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isOnline ? 'bg-green-500' : 'bg-gray-300'
                  } disabled:opacity-50`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      isOnline ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 flex items-center justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!isEdit && createMode === 'existing' && !selectedUserId)}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting && (
                <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              {isEdit ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Yardımcılar ───────────────────────────────────────────────────────────────

function inputClass(hasError: boolean): string {
  const base =
    'w-full pl-3 pr-3 py-2 text-sm border rounded-lg transition-all focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:cursor-not-allowed';
  return hasError
    ? `${base} border-red-300 bg-red-50 focus:ring-red-200 text-red-900 placeholder-red-300`
    : `${base} border-gray-200 bg-white focus:ring-indigo-300 focus:border-indigo-300 text-gray-900 placeholder-gray-400`;
}

interface FormFieldProps {
  label: string;
  required?: boolean;
  icon?: React.ReactNode;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

function FormField({ label, required, icon, error, hint, children }: FormFieldProps) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
        {icon}
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

interface VehicleOptionProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: VehicleType;
  label: string;
}

const VehicleOption = ({ value, label, disabled, ...props }: VehicleOptionProps) => (
  <label
    className={`relative cursor-pointer ${
      disabled ? 'opacity-50 cursor-not-allowed' : ''
    }`}
  >
    <input
      type="radio"
      value={value}
      disabled={disabled}
      className="peer sr-only"
      {...props}
    />
    <div className="px-3 py-2.5 text-sm font-medium text-center border-2 border-gray-200 rounded-lg bg-white text-gray-600 transition-all peer-checked:border-indigo-500 peer-checked:bg-indigo-50 peer-checked:text-indigo-700 peer-focus:ring-2 peer-focus:ring-indigo-200 hover:border-gray-300">
      {label}
    </div>
  </label>
);
