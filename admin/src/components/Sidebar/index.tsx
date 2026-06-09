import { NavLink } from 'react-router-dom';
import {
  MdDashboard,
  MdRestaurant,
  MdDeliveryDining,
  MdShoppingCart,
  MdMyLocation,
  MdGpsFixed,
  MdAssessment,
  MdManageAccounts,
  MdClose,
} from 'react-icons/md';

const navItems = [
  { to: '/', label: 'Dashboard', icon: MdDashboard },
  { to: '/restaurants', label: 'Restoranlar', icon: MdRestaurant },
  { to: '/couriers', label: 'Kuryeler', icon: MdDeliveryDining },
  { to: '/orders', label: 'Siparişler', icon: MdShoppingCart },
  { to: '/live-map', label: 'Canlı Harita', icon: MdMyLocation },
  { to: '/live-tracking', label: 'Canlı Takip', icon: MdGpsFixed },
  { to: '/reports', label: 'Raporlar', icon: MdAssessment },
  { to: '/users', label: 'Kullanıcı Yönetimi', icon: MdManageAccounts },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 min-h-screen bg-indigo-900 text-white flex flex-col shadow-xl transform transition-transform duration-200 lg:transform-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo + mobile close */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-indigo-700">
          <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center">
            <MdDeliveryDining className="text-white text-xl" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight">Kurye Sistemi</p>
            <p className="text-indigo-300 text-xs">Admin Panel</p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-indigo-200 hover:text-white p-1"
            aria-label="Menüyü kapat"
          >
            <MdClose className="text-xl" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
                }`
              }
            >
              <Icon className="text-lg flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-indigo-700">
          <p className="text-indigo-400 text-xs">v1.0.0</p>
        </div>
      </aside>
    </>
  );
}
