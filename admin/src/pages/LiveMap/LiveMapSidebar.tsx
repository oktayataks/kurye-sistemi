import {
  MdDeliveryDining,
  MdLocalShipping,
  MdPending,
  MdRestaurant,
  MdLocationOn,
  MdRefresh,
  MdFilterList,
  MdCenterFocusStrong,
} from 'react-icons/md';
import type { Order } from '../../types';
import { formatCurrency, formatRelativeTime } from '../../utils/helpers';
import { MARKER_COLORS } from './LiveMapMarkers';

interface LiveMapSidebarProps {
  onlineCouriers: number;
  totalCouriers: number;
  activeOrders: number;
  pendingOrders: Order[];
  totalRestaurants: number;
  showOnlineOnly: boolean;
  showActiveOnly: boolean;
  isPolling: boolean;
  lastUpdated: Date | null;
  onToggleOnline: () => void;
  onToggleActive: () => void;
  onRefresh: () => void;
  onFocusOrder: (order: Order) => void;
}

export default function LiveMapSidebar({
  onlineCouriers,
  totalCouriers,
  activeOrders,
  pendingOrders,
  totalRestaurants,
  showOnlineOnly,
  showActiveOnly,
  isPolling,
  lastUpdated,
  onToggleOnline,
  onToggleActive,
  onRefresh,
  onFocusOrder,
}: LiveMapSidebarProps) {
  return (
    <aside className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-br from-indigo-50 via-white to-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              Canlı Takip
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {lastUpdated ? (
                <>
                  Güncellendi:{' '}
                  <span className="font-medium text-gray-700">
                    {formatRelativeTime(lastUpdated.toISOString())}
                  </span>
                </>
              ) : (
                'Yükleniyor...'
              )}
            </p>
          </div>
          <button
            onClick={onRefresh}
            disabled={isPolling}
            className="p-2 hover:bg-white rounded-lg transition-colors text-gray-500 hover:text-indigo-600 disabled:opacity-50"
            title="Manuel yenile"
          >
            <MdRefresh className={isPolling ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 py-4 grid grid-cols-3 gap-2">
        <StatCard
          icon={<MdDeliveryDining />}
          label="Online"
          value={onlineCouriers}
          total={totalCouriers}
          color="blue"
        />
        <StatCard
          icon={<MdLocalShipping />}
          label="Aktif"
          value={activeOrders}
          color="green"
        />
        <StatCard
          icon={<MdRestaurant />}
          label="Restoran"
          value={totalRestaurants}
          color="red"
        />
      </div>

      {/* Filters */}
      <div className="px-5 pb-4 space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">
          <MdFilterList className="text-sm" />
          Filtreler
        </div>
        <FilterToggle
          label="Sadece çevrimiçi kuryeler"
          checked={showOnlineOnly}
          onChange={onToggleOnline}
          color={MARKER_COLORS.courier}
        />
        <FilterToggle
          label="Sadece aktif siparişler"
          checked={showActiveOnly}
          onChange={onToggleActive}
          color={MARKER_COLORS.delivery}
        />
      </div>

      {/* Legend */}
      <div className="px-5 pb-3">
        <div className="bg-gray-50 rounded-lg px-3 py-2.5 space-y-1.5">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Harita Açıklaması
          </p>
          <LegendItem color={MARKER_COLORS.restaurant} emoji="🏪" label="Restoran" />
          <LegendItem
            color={MARKER_COLORS.courier}
            emoji="🛵"
            label="Çevrimiçi Kurye"
          />
          <LegendItem
            color={MARKER_COLORS.delivery}
            emoji="🏠"
            label="Teslimat Noktası"
          />
        </div>
      </div>

      {/* Pending Orders List */}
      <div className="flex-1 overflow-hidden flex flex-col border-t border-gray-100">
        <div className="px-5 pt-3 pb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
            <MdPending className="text-yellow-500 text-sm" />
            Bekleyen Siparişler
          </h3>
          <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
            {pendingOrders.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
          {pendingOrders.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MdPending className="mx-auto text-3xl text-gray-300 mb-1.5" />
              <p className="text-xs text-gray-500">
                Bekleyen sipariş bulunmuyor
              </p>
            </div>
          ) : (
            pendingOrders.map((order) => (
              <PendingOrderCard
                key={order.id}
                order={order}
                onFocus={() => onFocusOrder(order)}
              />
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/50">
        <p className="text-[10px] text-gray-400 text-center">
          Otomatik güncelleme: 5 saniye
        </p>
      </div>
    </aside>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  total?: number;
  color: 'blue' | 'green' | 'red';
}

function StatCard({ icon, label, value, total, color }: StatCardProps) {
  const colorMap = {
    blue: 'from-blue-50 to-blue-100 text-blue-600 border-blue-200',
    green: 'from-green-50 to-green-100 text-green-600 border-green-200',
    red: 'from-red-50 to-red-100 text-red-600 border-red-200',
  };

  return (
    <div
      className={`bg-gradient-to-br border rounded-xl px-2.5 py-2.5 ${colorMap[color]}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-base">{icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75">
          {label}
        </span>
      </div>
      <p className="text-xl font-bold leading-none">
        {value}
        {total !== undefined && (
          <span className="text-xs font-medium opacity-50 ml-0.5">/{total}</span>
        )}
      </p>
    </div>
  );
}

// ─── Filter Toggle ───────────────────────────────────────────────────────────

interface FilterToggleProps {
  label: string;
  checked: boolean;
  onChange: () => void;
  color: string;
}

function FilterToggle({ label, checked, onChange, color }: FilterToggleProps) {
  return (
    <button
      onClick={onChange}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-xs ${
        checked
          ? 'border-gray-300 bg-white shadow-sm'
          : 'border-gray-200 bg-gray-50 hover:bg-white'
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="font-medium text-gray-700">{label}</span>
      </span>
      <span
        className={`relative inline-flex h-4 w-7 flex-shrink-0 rounded-full transition-colors ${
          checked ? 'bg-indigo-500' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-3 w-3 mt-0.5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-3.5' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}

// ─── Legend Item ─────────────────────────────────────────────────────────────

function LegendItem({
  color,
  emoji,
  label,
}: {
  color: string;
  emoji: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px]"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {emoji}
      </span>
      <span className="text-gray-600">{label}</span>
    </div>
  );
}

// ─── Pending Order Card ──────────────────────────────────────────────────────

function PendingOrderCard({
  order,
  onFocus,
}: {
  order: Order;
  onFocus: () => void;
}) {
  const hasLocation = !!order.deliveryLatitude && !!order.deliveryLongitude;

  return (
    <button
      onClick={onFocus}
      disabled={!hasLocation}
      className="w-full text-left px-3 py-2.5 bg-white hover:bg-yellow-50/60 border border-gray-100 hover:border-yellow-200 rounded-lg transition-all group disabled:opacity-60 disabled:cursor-not-allowed"
      title={hasLocation ? 'Haritada göster' : 'Konum bilgisi yok'}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-xs font-mono font-bold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
          #{order.orderNumber}
        </span>
        <span className="text-xs font-semibold text-gray-800">
          {formatCurrency(order.orderTotal)}
        </span>
      </div>

      <p className="text-xs font-medium text-gray-900 truncate">
        {order.customerName}
      </p>
      <p className="text-[11px] text-gray-500 truncate flex items-center gap-1 mt-0.5">
        <MdRestaurant className="text-xs flex-shrink-0" />
        {order.restaurant?.name ?? '—'}
      </p>
      <p className="text-[10px] text-gray-400 truncate mt-0.5 line-clamp-1">
        {order.deliveryAddress}
      </p>

      {hasLocation && (
        <div className="flex items-center gap-1 text-[10px] text-yellow-700 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <MdCenterFocusStrong />
          Haritada odakla
        </div>
      )}
      {!hasLocation && (
        <div className="flex items-center gap-1 text-[10px] text-red-500 mt-1.5">
          <MdLocationOn />
          Konum yok
        </div>
      )}
    </button>
  );
}
