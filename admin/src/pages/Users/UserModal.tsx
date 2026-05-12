import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  MdClose,
  MdPerson,
  MdEmail,
  MdLock,
  MdPhone,
  MdAdminPanelSettings,
  MdStorefront,
  MdDeliveryDining,
  MdToggleOn,
} from 'react-icons/md';
import type { User } from '../../types';

export interface UserFormData {
  email: string;
  password?: string;
  fullName: string;
  phone?: string;
  role: 'admin' | 'restaurant' | 'courier';
  isActive?: boolean;
}

interface UserModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  user?: User | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => void;
}

const EMPTY_FORM: UserFormData = {
  email: '',
  password: '',
  fullName: '',
  phone: '',
  role: 'courier',
  isActive: true,
};

const ROLE_OPTIONS: {
  value: 'admin' | 'restaurant' | 'courier';
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  ringColor: string;
}[] = [
  {
    value: 'admin',
    label: 'Admin',
    description: 'Sistemin tamamına yetkili. Tüm kullanıcı, restoran, kurye ve siparişleri yönetir.',
    icon: MdAdminPanelSettings,
    color: 'text-purple-600 bg-purple-50',
    ringColor: 'ring-purple-500 border-purple-500 bg-purple-50/50',
  },
  {
    value: 'restaurant',
    label: 'Restoran',
    description: 'Restoran panelinde kendi siparişlerini görür, sipariş oluşturabilir.',
    icon: MdStorefront,
    color: 'text-amber-600 bg-amber-50',
    ringColor: 'ring-amber-500 border-amber-500 bg-amber-50/50',
  },
  {
    value: 'courier',
    label: 'Kurye',
    description: 'Mobil uygulamadan teslimat siparişlerini alır ve durumunu günceller.',
    icon: MdDeliveryDining,
    color: 'text-emerald-600 bg-emerald-50',
    ringColor: 'ring-emerald-500 border-emerald-500 bg-emerald-50/50',
  },
];

export default function UserModal({
  isOpen,
  mode,
  user,
  isSubmitting = false,
  onClose,
  onSubmit,
}: UserModalProps) {
  const isEdit = mode === 'edit';

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserFormData>({
    defaultValues: EMPTY_FORM,
  });

  const selectedRole = watch('role');
  const isActive = watch('isActive');

  useEffect(() => {
    if (!isOpen) return;
    if (isEdit && user) {
      reset({
        email: user.email,
        password: '',
        fullName: user.fullName,
        phone: user.phone ?? '',
        role: user.role,
        isActive: user.isActive,
      });
    } else {
      reset(EMPTY_FORM);
    }
  }, [isOpen, isEdit, user, reset]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const submitHandler = (data: UserFormData) => {
    const payload: UserFormData = {
      email: data.email.trim().toLowerCase(),
      fullName: data.fullName.trim(),
      phone: data.phone?.trim() || undefined,
      role: data.role,
      isActive: data.isActive ?? true,
    };
    if (data.password && data.password.length > 0) {
      payload.password = data.password;
    }
    onSubmit(payload);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={() => !isSubmitting && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <MdPerson className="text-indigo-600 text-xl" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {isEdit ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı Ekle'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {isEdit
                  ? 'Kullanıcı bilgilerini güncelleyin'
                  : 'Sisteme yeni bir kullanıcı ekleyin ve rolünü belirleyin'}
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
            {/* Ad Soyad */}
            <FormField
              label="Ad Soyad"
              required
              icon={<MdPerson className="text-gray-400 text-lg" />}
              error={errors.fullName?.message}
            >
              <input
                type="text"
                placeholder="Örn: Ali Yılmaz"
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
            >
              <input
                type="email"
                placeholder="ornek@firma.com"
                disabled={isSubmitting}
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

            {/* Şifre */}
            <FormField
              label={isEdit ? 'Yeni Şifre (boşsa değişmez)' : 'Şifre'}
              required={!isEdit}
              icon={<MdLock className="text-gray-400 text-lg" />}
              error={errors.password?.message}
            >
              <input
                type="password"
                placeholder={isEdit ? '••••••••  (değiştirmek için doldurun)' : 'En az 6 karakter'}
                disabled={isSubmitting}
                autoComplete="new-password"
                className={inputClass(!!errors.password)}
                {...register('password', {
                  required: isEdit ? false : 'Şifre zorunludur',
                  minLength: {
                    value: 6,
                    message: 'Şifre en az 6 karakter olmalıdır',
                  },
                  validate: (v) => {
                    if (isEdit && (!v || v.length === 0)) return true;
                    if (v && v.length < 6) return 'Şifre en az 6 karakter olmalıdır';
                    return true;
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

            {/* Rol seçimi (kart görseli) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                <MdAdminPanelSettings className="text-gray-400" />
                Kullanıcı Rolü
                <span className="text-red-500">*</span>
              </label>
              <input type="hidden" {...register('role', { required: true })} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {ROLE_OPTIONS.map(({ value, label, description, icon: Icon, color, ringColor }) => {
                  const active = selectedRole === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setValue('role', value, { shouldValidate: true })}
                      disabled={isSubmitting}
                      className={`text-left p-3 rounded-xl border-2 transition-all ${
                        active
                          ? `ring-2 ring-offset-1 ${ringColor}`
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60'
                      } disabled:opacity-50`}
                    >
                      <div
                        className={`inline-flex items-center justify-center w-9 h-9 rounded-lg mb-2 ${color}`}
                      >
                        <Icon className="text-lg" />
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{label}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                        {description}
                      </p>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                <strong>Not:</strong> Restoran rolündeki kullanıcı için ayrıca{' '}
                <em>Restoranlar</em> sayfasından bir restoran kaydı oluşturmanız gerekir.
                Aynı şekilde Kurye rolü için <em>Kuryeler</em> sayfasında kurye profili
                eklenmelidir.
              </p>
            </div>

            {/* Aktif/Pasif (sadece edit modunda görünür) */}
            {isEdit && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <MdToggleOn className="text-gray-400 text-lg" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Hesap Durumu</p>
                    <p className="text-xs text-gray-500">
                      Pasif kullanıcılar sisteme giriş yapamaz
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setValue('isActive', !isActive)}
                  disabled={isSubmitting}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                    isActive ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                      isActive ? 'translate-x-5' : 'translate-x-0.5'
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
