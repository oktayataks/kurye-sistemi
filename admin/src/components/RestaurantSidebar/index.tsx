import { NavLink } from 'react-router-dom';
import {
  MdDashboard,
  MdAddCircleOutline,
  MdReceiptLong,
  MdRestaurant,
  MdClose,
} from 'react-icons/md';
import { useMyRestaurant } from '../../hooks/useMyRestaurant';

const navItems = [
  { to: '/restaurant', label: 'Dashboard', icon: MdDashboard, end: true },
  {
    to: '/restaurant/create-order',
    label: 'Yeni Sipariş',
    icon: MdAddCircleOutline,
  },
  {
    to: '/restaurant/my-orders',
    label: 'Siparişlerim',
    icon: MdReceiptLong,
  },
];

interface RestaurantSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function RestaurantSidebar({
  isOpen = false,
  onClose,
}: RestaurantSidebarProps) {
  const { restaurant } = useMyRestaurant();

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
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 min-h-screen bg-gradient-to-b from-orange-700 to-amber-800 text-white flex flex-col shadow-xl transform transition-transform duration-200 lg:transform-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo + mobile close */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-orange-600">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-md">
            <MdRestaurant className="text-white text-xl" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm leading-tight truncate">
              {restaurant?.name ?? 'Restoran Paneli'}
            </p>
            <p className="text-orange-200 text-xs">Restoran</p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-orange-100 hover:text-white p-1"
            aria-label="Menüyü kapat"
          >
            <MdClose className="text-xl" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'text-orange-100 hover:bg-orange-800/60 hover:text-white'
                }`
              }
            >
              <Icon className="text-lg flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-orange-600">
          <p className="text-orange-300 text-xs">v1.0.0 • Restoran</p>
        </div>
      </aside>
    </>
  );
}
