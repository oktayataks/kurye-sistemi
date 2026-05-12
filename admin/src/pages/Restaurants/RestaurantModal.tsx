import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import {
  MdClose,
  MdStorefront,
  MdLocationOn,
  MdPhone,
  MdMyLocation,
  MdPerson,
} from 'react-icons/md';
import { usersApi } from '../../services/api';
import type { Restaurant, User } from '../../types';

export interface RestaurantFormData {
  name: string;
  address: string;
  phone?: string;
  latitude?: number | null;
  longitude?: number | null;
  userId?: string;
}

interface RestaurantModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  restaurant?: Restaurant | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (data: RestaurantFormData) => void;
}

const EMPTY_FORM: RestaurantFormData = {
  name: '',
  address: '',
  phone: '',
  latitude: null,
  longitude: null,
  userId: '',
};

export default function RestaurantModal({
  isOpen,
  mode,
  restaurant,
  isSubmitting = false,
  onClose,
  onSubmit,
}: RestaurantModalProps) {
  const isEdit = mode === 'edit';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RestaurantFormData>({
    defaultValues: EMPTY_FORM,
  });

  // Yeni restoran ekleme modunda kullanıcı listesini çek (sahip seçimi)
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll().then((r) => r.data),
    enabled: isOpen && !isEdit,
    staleTime: 60_000,
  });

  const restaurantUsers = ((usersData ?? []) as User[]).filter(
    (u) => u.role === 'restaurant',
  );

  useEffect(() => {
    if (!isOpen) return;
    if (isEdit && restaurant) {
      reset({
        name: restaurant.name,
        address: restaurant.address,
        phone: restaurant.phone ?? '',
        latitude: restaurant.latitude ?? null,
        longitude: restaurant.longitude ?? null,
        userId: restaurant.userId,
      });
    } else {
      reset(EMPTY_FORM);
    }
  }, [isOpen, isEdit, restaurant, reset]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const submitHandler = (data: RestaurantFormData) => {
    const payload: RestaurantFormData = {
      name: data.name.trim(),
      address: data.address.trim(),
      phone: data.phone?.trim() || undefined,
      latitude:
        data.latitude === null || data.latitude === undefined || isNaN(Number(data.latitude))
          ? null
          : Number(data.latitude),
      longitude:
        data.longitude === null || data.longitude === undefined || isNaN(Number(data.longitude))
          ? null
          : Number(data.longitude),
    };
    if (!isEdit) {
      payload.userId = data.userId;
    }
    onSubmit(payload);
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
              <MdStorefront className="text-indigo-600 text-xl" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {isEdit ? 'Restoranı Düzenle' : 'Yeni Restoran Ekle'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {isEdit ? 'Restoran bilgilerini güncelleyin' : 'Yeni restoran kaydı oluşturun'}
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
            {/* İsim */}
            <FormField
              label="Restoran Adı"
              required
              icon={<MdStorefront className="text-gray-400 text-lg" />}
              error={errors.name?.message}
            >
              <input
                type="text"
                placeholder="Örn: Lezzet Köşesi"
                disabled={isSubmitting}
                className={inputClass(!!errors.name)}
                {...register('name', {
                  required: 'Restoran adı zorunludur',
                  minLength: { value: 2, message: 'En az 2 karakter olmalıdır' },
                  maxLength: { value: 100, message: 'En fazla 100 karakter olabilir' },
                })}
              />
            </FormField>

            {/* Adres */}
            <FormField
              label="Adres"
              required
              icon={<MdLocationOn className="text-gray-400 text-lg" />}
              error={errors.address?.message}
            >
              <textarea
                rows={2}
                placeholder="Atatürk Cad. No:1, Kadıköy / İstanbul"
                disabled={isSubmitting}
                className={`${inputClass(!!errors.address)} resize-none`}
                {...register('address', {
                  required: 'Adres zorunludur',
                  minLength: { value: 5, message: 'En az 5 karakter olmalıdır' },
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
                placeholder="05001234567"
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

            {/* Konum (lat/lng) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
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
                        if (v === null || v === undefined || isNaN(Number(v))) return true;
                        const n = Number(v);
                        if (n < -90 || n > 90) return 'Enlem -90 ile 90 arasında olmalıdır';
                        return true;
                      },
                    })}
                  />
                  {errors.latitude?.message && (
                    <p className="mt-1 text-xs text-red-600">⚠ {errors.latitude.message}</p>
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
                        if (v === null || v === undefined || isNaN(Number(v))) return true;
                        const n = Number(v);
                        if (n < -180 || n > 180) return 'Boylam -180 ile 180 arasında olmalıdır';
                        return true;
                      },
                    })}
                  />
                  {errors.longitude?.message && (
                    <p className="mt-1 text-xs text-red-600">⚠ {errors.longitude.message}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Otomatik kurye atama için konum gereklidir.
              </p>
            </div>

            {/* Sahip (yalnızca yeni eklemede) */}
            {!isEdit && (
              <FormField
                label="Restoran Sahibi"
                required
                icon={<MdPerson className="text-gray-400 text-lg" />}
                error={errors.userId?.message}
              >
                <select
                  disabled={isSubmitting || usersLoading}
                  className={inputClass(!!errors.userId)}
                  {...register('userId', {
                    required: 'Sahip seçimi zorunludur',
                  })}
                >
                  <option value="">
                    {usersLoading ? 'Yükleniyor...' : 'Sahip seçiniz'}
                  </option>
                  {restaurantUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} — {u.email}
                    </option>
                  ))}
                </select>
                {!usersLoading && restaurantUsers.length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1.5">
                    ⚠ Restaurant rolünde kullanıcı bulunamadı. Önce bir kullanıcı oluşturun.
                  </p>
                )}
              </FormField>
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
              disabled={isSubmitting}
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
  children: React.ReactNode;
}

function FormField({ label, required, icon, error, children }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
        {icon}
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}
