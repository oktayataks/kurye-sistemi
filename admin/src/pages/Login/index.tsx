import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import {
  MdDeliveryDining,
  MdEmail,
  MdLock,
  MdVisibility,
  MdVisibilityOff,
} from 'react-icons/md';
import { login as apiLogin } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitted },
    setError,
  } = useForm<LoginFormData>({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await apiLogin(data.email, data.password);
      login(response.accessToken, response.user);
      toast.success(`Hoş geldiniz, ${response.user.fullName}! 👋`);

      // Rol bazlı yönlendirme
      const redirectMap: Record<string, string> = {
        admin: '/',
        restaurant: '/restaurant',
      };
      const target = redirectMap[response.user.role] ?? '/';
      navigate(target, { replace: true });
    } catch (err: any) {
      const msg =
        err.response?.data?.message ?? 'Giriş yapılamadı. Lütfen tekrar deneyin.';

      if (err.response?.status === 401) {
        setError('email', { message: ' ' });
        setError('password', { message: 'E-posta veya şifre hatalı' });
      } else {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 flex items-center justify-center p-4">
      {/* Arka plan dekorasyon */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm sm:max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl mb-4 shadow-xl">
            <MdDeliveryDining className="text-white text-4xl" />
          </div>
          <h1 className="text-white text-2xl sm:text-3xl font-bold tracking-tight">
            Kurye Sistemi
          </h1>
          <p className="text-indigo-300 text-sm mt-1.5">
            Admin paneline giriş yapın
          </p>
        </div>

        {/* Kart */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/50">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">

            {/* E-posta */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                E-posta adresi
              </label>
              <div className="relative">
                <MdEmail
                  className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-lg transition-colors ${
                    errors.email ? 'text-red-400' : 'text-gray-400'
                  }`}
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="ornek@sirket.com"
                  className={`w-full pl-10 pr-4 py-2.5 text-sm border rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                    errors.email
                      ? 'border-red-400 bg-red-50 focus:ring-red-300 text-red-900 placeholder-red-300'
                      : 'border-gray-200 bg-white focus:ring-indigo-400 focus:border-indigo-400 text-gray-900 placeholder-gray-400'
                  }`}
                  {...register('email', {
                    required: 'E-posta adresi zorunludur',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Geçerli bir e-posta adresi girin',
                    },
                  })}
                />
              </div>
              {errors.email && errors.email.message !== ' ' && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <span>⚠</span> {errors.email.message}
                </p>
              )}
            </div>

            {/* Şifre */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Şifre
              </label>
              <div className="relative">
                <MdLock
                  className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-lg transition-colors ${
                    errors.password ? 'text-red-400' : 'text-gray-400'
                  }`}
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-11 py-2.5 text-sm border rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                    errors.password
                      ? 'border-red-400 bg-red-50 focus:ring-red-300 text-red-900 placeholder-red-300'
                      : 'border-gray-200 bg-white focus:ring-indigo-400 focus:border-indigo-400 text-gray-900 placeholder-gray-400'
                  }`}
                  {...register('password', {
                    required: 'Şifre zorunludur',
                    minLength: {
                      value: 6,
                      message: 'Şifre en az 6 karakter olmalıdır',
                    },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <MdVisibilityOff className="text-lg" />
                  ) : (
                    <MdVisibility className="text-lg" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <span>⚠</span> {errors.password.message}
                </p>
              )}
            </div>

            {/* Genel hata (401 dışındaki durumlar için sağlanan boş alan) */}
            {isSubmitted && errors.password?.message === 'E-posta veya şifre hatalı' && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="text-red-500 text-base flex-shrink-0">✕</span>
                <p className="text-sm text-red-700">
                  E-posta veya şifre hatalı. Lütfen tekrar deneyin.
                </p>
              </div>
            )}

            {/* Giriş Butonu */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Giriş yapılıyor...</span>
                </>
              ) : (
                'Giriş Yap'
              )}
            </button>
          </form>
        </div>

        {/* Alt bilgi */}
        <p className="text-center text-indigo-400 text-xs mt-6">
          © {new Date().getFullYear()} Kurye Yönetim Sistemi
        </p>
      </div>
    </div>
  );
}
