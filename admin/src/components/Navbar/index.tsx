import { MdLogout, MdPerson, MdMenu } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../services/api';

interface NavbarProps {
  onMenuClick?: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // token süresi dolmuş olabilir
    } finally {
      logout();
      navigate('/login');
    }
  };

  const roleLabels: Record<string, string> = {
    admin: 'Yönetici',
    restaurant: 'Restoran',
    courier: 'Kurye',
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shadow-sm">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Menüyü aç"
          >
            <MdMenu className="text-2xl" />
          </button>
        )}
        <h1 className="text-gray-700 font-semibold text-sm sm:text-base truncate">
          Kurye Yönetim Sistemi
        </h1>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
            <MdPerson className="text-indigo-600 text-lg" />
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-800 leading-tight">
              {user?.fullName}
            </p>
            <p className="text-xs text-gray-500">
              {roleLabels[user?.role ?? ''] ?? user?.role}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
        >
          <MdLogout className="text-base" />
          <span className="hidden sm:inline">Çıkış</span>
        </button>
      </div>
    </header>
  );
}
