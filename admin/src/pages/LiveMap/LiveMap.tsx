import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import L, { type LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { restaurantsApi, couriersApi, ordersApi } from '../../services/api';
import type {
  Courier,
  Order,
  PaginatedResult,
  Restaurant,
} from '../../types';
import {
  VEHICLE_LABELS,
  formatCurrency,
  formatDistance,
  haversineDistance,
} from '../../utils/helpers';

import LiveMapSidebar from './LiveMapSidebar';
import {
  RESTAURANT_ICON,
  COURIER_ICON,
  COURIER_BUSY_ICON,
  DELIVERY_ICON,
  DELIVERY_PULSE_ICON,
} from './LiveMapMarkers';

const POLL_INTERVAL_MS = 5_000;
const ISTANBUL_CENTER: LatLngTuple = [41.0082, 28.9784];
const ACTIVE_STATUSES = ['pending', 'assigned', 'picked_up'] as const;

// ─── İçerik komponent: harita + sidebar ─────────────────────────────────────

export default function LiveMap() {
  const [showOnlineOnly, setShowOnlineOnly] = useState(true);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [focusPosition, setFocusPosition] = useState<LatLngTuple | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const lastUpdatedRef = useRef<Date | null>(null);

  // ─── Tek query'de tüm veri (5 sn polling) ──────────────────────────────────
  const { data, isFetching, refetch } = useQuery({
    queryKey: ['live-map'],
    queryFn: async () => {
      const [restaurantsRes, couriersRes, ordersRes] = await Promise.all([
        restaurantsApi.getAll({ page: 1, limit: 200 }),
        couriersApi.getAll({ page: 1, limit: 200 }),
        ordersApi.getAll({ page: 1, limit: 200 }),
      ]);

      lastUpdatedRef.current = new Date();
      return {
        restaurants: (restaurantsRes.data as PaginatedResult<Restaurant>).data,
        couriers: (couriersRes.data as PaginatedResult<Courier>).data,
        orders: (ordersRes.data as PaginatedResult<Order>).data,
      };
    },
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // ─── Türetilmiş veri ────────────────────────────────────────────────────────
  const restaurants = data?.restaurants ?? [];
  const couriers = data?.couriers ?? [];
  const orders = data?.orders ?? [];

  const visibleCouriers = useMemo(
    () =>
      couriers.filter((c) => {
        if (showOnlineOnly && !c.isOnline) return false;
        return c.latitude != null && c.longitude != null;
      }),
    [couriers, showOnlineOnly],
  );

  const visibleOrders = useMemo(
    () =>
      orders.filter((o) => {
        if (showActiveOnly && !ACTIVE_STATUSES.includes(o.status as any)) {
          return false;
        }
        return o.deliveryLatitude != null && o.deliveryLongitude != null;
      }),
    [orders, showActiveOnly],
  );

  // ─── İstatistikler ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const onlineCount = couriers.filter((c) => c.isOnline).length;
    const activeOrders = orders.filter((o) =>
      ACTIVE_STATUSES.includes(o.status as any),
    );
    const pendingOrders = orders.filter((o) => o.status === 'pending');
    return {
      onlineCouriers: onlineCount,
      totalCouriers: couriers.length,
      activeOrders: activeOrders.length,
      pendingOrders,
      totalRestaurants: restaurants.length,
    };
  }, [couriers, orders, restaurants]);

  // ─── Sipariş → Restoran/Kurye eşleştirmeleri (rota çizgileri için) ─────────
  const orderRoutes = useMemo(() => {
    return visibleOrders
      .map((order) => {
        const restaurant = restaurants.find((r) => r.id === order.restaurantId);
        const courier = order.courierId
          ? couriers.find((c) => c.id === order.courierId)
          : null;

        return {
          order,
          restaurantPos:
            restaurant?.latitude && restaurant?.longitude
              ? ([Number(restaurant.latitude), Number(restaurant.longitude)] as LatLngTuple)
              : null,
          deliveryPos: [
            Number(order.deliveryLatitude),
            Number(order.deliveryLongitude),
          ] as LatLngTuple,
          courierPos:
            courier?.latitude && courier?.longitude
              ? ([Number(courier.latitude), Number(courier.longitude)] as LatLngTuple)
              : null,
        };
      })
      .filter((r) => r.restaurantPos);
  }, [visibleOrders, restaurants, couriers]);

  // ─── Auto-fit bounds (sadece ilk yüklemede) ─────────────────────────────────
  const allPositions = useMemo<LatLngTuple[]>(() => {
    const positions: LatLngTuple[] = [];
    restaurants.forEach((r) => {
      if (r.latitude && r.longitude)
        positions.push([Number(r.latitude), Number(r.longitude)]);
    });
    visibleCouriers.forEach((c) =>
      positions.push([Number(c.latitude), Number(c.longitude)]),
    );
    visibleOrders.forEach((o) =>
      positions.push([
        Number(o.deliveryLatitude),
        Number(o.deliveryLongitude),
      ]),
    );
    return positions;
  }, [restaurants, visibleCouriers, visibleOrders]);

  // ─── Sidebar callbacks ──────────────────────────────────────────────────────
  const handleFocusOrder = (order: Order) => {
    if (order.deliveryLatitude && order.deliveryLongitude) {
      setFocusPosition([
        Number(order.deliveryLatitude),
        Number(order.deliveryLongitude),
      ]);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="-m-4 sm:-m-6 flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden">
      {/* Mobile toggle button */}
      <button
        className="md:hidden flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 text-sm font-medium text-gray-700 z-10"
        onClick={() => setPanelOpen((v) => !v)}
      >
        <span className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          Panel — {stats.onlineCouriers} online kurye, {stats.activeOrders} aktif sipariş
        </span>
        <span>{panelOpen ? '▲' : '▼'}</span>
      </button>

      {/* Sidebar */}
      <div className={`md:block ${panelOpen ? 'block' : 'hidden'} md:h-full`}>
        <LiveMapSidebar
          onlineCouriers={stats.onlineCouriers}
          totalCouriers={stats.totalCouriers}
          activeOrders={stats.activeOrders}
          pendingOrders={stats.pendingOrders}
          totalRestaurants={stats.totalRestaurants}
          showOnlineOnly={showOnlineOnly}
          showActiveOnly={showActiveOnly}
          isPolling={isFetching}
          lastUpdated={lastUpdatedRef.current}
          onToggleOnline={() => setShowOnlineOnly((v) => !v)}
          onToggleActive={() => setShowActiveOnly((v) => !v)}
          onRefresh={() => refetch()}
          onFocusOrder={handleFocusOrder}
        />
      </div>

      {/* Map */}
      <div className="flex-1 relative min-h-[300px]">
        <MapContainer
          center={ISTANBUL_CENTER}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Auto-fit + focus */}
          <MapEffects
            positions={allPositions}
            focusPosition={focusPosition}
            onFocusComplete={() => setFocusPosition(null)}
          />

          {/* Restoranlar */}
          {restaurants.map((r) => {
            if (!r.latitude || !r.longitude) return null;
            return (
              <Marker
                key={`r-${r.id}`}
                position={[Number(r.latitude), Number(r.longitude)]}
                icon={RESTAURANT_ICON}
              >
                <Popup>
                  <div className="text-xs space-y-0.5">
                    <p className="font-bold text-red-600 mb-1">🏪 {r.name}</p>
                    <p className="text-gray-600">{r.address}</p>
                    {r.phone && (
                      <p className="text-gray-500">📞 {r.phone}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Kuryeler */}
          {visibleCouriers.map((c) => (
            <Marker
              key={`c-${c.id}`}
              position={[Number(c.latitude), Number(c.longitude)]}
              icon={c.currentOrders > 0 ? COURIER_BUSY_ICON : COURIER_ICON}
            >
              <Popup>
                <CourierPopup courier={c} />
              </Popup>
            </Marker>
          ))}

          {/* Teslimat noktaları */}
          {visibleOrders.map((o) => (
            <Marker
              key={`o-${o.id}`}
              position={[
                Number(o.deliveryLatitude),
                Number(o.deliveryLongitude),
              ]}
              icon={o.status === 'pending' ? DELIVERY_PULSE_ICON : DELIVERY_ICON}
            >
              <Popup>
                <DeliveryPopup order={o} />
              </Popup>
            </Marker>
          ))}

          {/* Rota çizgileri (assigned/picked_up siparişler için) */}
          {orderRoutes.map(({ order, restaurantPos, deliveryPos, courierPos }) => {
            if (!restaurantPos) return null;
            const isActive =
              order.status === 'assigned' || order.status === 'picked_up';
            if (!isActive) return null;

            return (
              <Fragment key={`route-${order.id}`}>
                {/* Kurye → Restoran */}
                {courierPos && order.status === 'assigned' && (
                  <Polyline
                    positions={[courierPos, restaurantPos]}
                    pathOptions={{
                      color: '#3b82f6',
                      weight: 2.5,
                      opacity: 0.55,
                      dashArray: '6, 6',
                    }}
                  />
                )}
                {/* Restoran → Teslimat */}
                <Polyline
                  positions={[restaurantPos, deliveryPos]}
                  pathOptions={{
                    color: order.status === 'picked_up' ? '#10b981' : '#94a3b8',
                    weight: 2.5,
                    opacity: 0.55,
                    dashArray: '4, 4',
                  }}
                />
                {/* Kurye → Teslimat (picked_up ise) */}
                {courierPos && order.status === 'picked_up' && (
                  <Polyline
                    positions={[courierPos, deliveryPos]}
                    pathOptions={{
                      color: '#10b981',
                      weight: 3,
                      opacity: 0.7,
                    }}
                  />
                )}
              </Fragment>
            );
          })}
        </MapContainer>

        {/* Floating "live" indicator */}
        {isFetching && (
          <div className="absolute top-4 right-4 z-[400] bg-white shadow-lg rounded-full px-3 py-1.5 flex items-center gap-2 text-xs font-medium text-gray-700">
            <span className="h-2 w-2 bg-indigo-500 rounded-full animate-pulse"></span>
            Güncelleniyor...
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MapEffects: auto-fit ve focus ──────────────────────────────────────────

interface MapEffectsProps {
  positions: LatLngTuple[];
  focusPosition: LatLngTuple | null;
  onFocusComplete: () => void;
}

function MapEffects({
  positions,
  focusPosition,
  onFocusComplete,
}: MapEffectsProps) {
  const map = useMap();
  const fittedRef = useRef(false);

  // İlk yüklemede tüm marker'ları kapsa
  useEffect(() => {
    if (fittedRef.current || positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 14);
    } else {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
    fittedRef.current = true;
  }, [positions, map]);

  // Sidebar'dan tıklanan siparişe odakla
  useEffect(() => {
    if (!focusPosition) return;
    map.flyTo(focusPosition, 15, { duration: 0.8 });
    const timer = setTimeout(() => onFocusComplete(), 1000);
    return () => clearTimeout(timer);
  }, [focusPosition, map, onFocusComplete]);

  return null;
}

// ─── Kurye Popup ─────────────────────────────────────────────────────────────

function CourierPopup({ courier }: { courier: Courier }) {
  return (
    <div className="text-xs space-y-1 min-w-[180px]">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {(courier.user?.fullName ?? '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-gray-900 truncate">
            {courier.user?.fullName ?? '—'}
          </p>
          <p className="text-[10px] text-gray-500">
            {VEHICLE_LABELS[courier.vehicleType]}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-gray-100">
        <div>
          <p className="text-[10px] text-gray-400 uppercase">Aktif Sipariş</p>
          <p className="font-bold text-base text-blue-600">
            {courier.currentOrders}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase">Rating</p>
          <p className="font-bold text-base text-yellow-600">
            ⭐ {Number(courier.rating).toFixed(1)}
          </p>
        </div>
      </div>

      {courier.user?.phone && (
        <p className="text-gray-500 pt-1 border-t border-gray-100">
          📞 {courier.user.phone}
        </p>
      )}

      <div className="flex items-center gap-1.5 pt-1">
        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
        <span className="text-[10px] font-medium text-green-700">
          Çevrimiçi
        </span>
      </div>
    </div>
  );
}

// ─── Teslimat Popup ──────────────────────────────────────────────────────────

function DeliveryPopup({ order }: { order: Order }) {
  const distanceFromRestaurant =
    order.restaurant?.latitude &&
    order.restaurant?.longitude &&
    order.deliveryLatitude &&
    order.deliveryLongitude
      ? haversineDistance(
          Number(order.restaurant.latitude),
          Number(order.restaurant.longitude),
          Number(order.deliveryLatitude),
          Number(order.deliveryLongitude),
        )
      : null;

  return (
    <div className="text-xs space-y-1 min-w-[200px]">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="font-mono font-bold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
          #{order.orderNumber}
        </span>
        <StatusBadge status={order.status} />
      </div>

      <p className="font-bold text-gray-900">{order.customerName}</p>
      <p className="text-gray-500 text-[10px]">{order.customerPhone}</p>
      <p className="text-gray-600 mt-1">{order.deliveryAddress}</p>

      <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-gray-100">
        <div>
          <p className="text-[10px] text-gray-400 uppercase">Restoran</p>
          <p className="font-medium text-gray-700 truncate">
            {order.restaurant?.name ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 uppercase">Tutar</p>
          <p className="font-bold text-gray-800">
            {formatCurrency(order.orderTotal)}
          </p>
        </div>
      </div>

      {distanceFromRestaurant !== null && (
        <p className="text-[10px] text-gray-500 pt-1 border-t border-gray-100">
          📏 Restoranla mesafe:{' '}
          <span className="font-semibold text-gray-700">
            {formatDistance(distanceFromRestaurant)}
          </span>
        </p>
      )}

      {order.courier && (
        <p className="text-[10px] text-gray-500">
          🛵 Kurye:{' '}
          <span className="font-medium text-gray-700">
            {order.courier.user?.fullName}
          </span>
        </p>
      )}
    </div>
  );
}

// ─── Status Badge (mini) ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: 'Bekliyor', className: 'bg-yellow-100 text-yellow-700' },
    assigned: { label: 'Atandı', className: 'bg-blue-100 text-blue-700' },
    picked_up: {
      label: 'Yolda',
      className: 'bg-purple-100 text-purple-700',
    },
    delivered: {
      label: 'Teslim',
      className: 'bg-green-100 text-green-700',
    },
    cancelled: { label: 'İptal', className: 'bg-red-100 text-red-700' },
  };
  const c = config[status] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-700',
  };
  return (
    <span
      className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${c.className}`}
    >
      {c.label}
    </span>
  );
}
