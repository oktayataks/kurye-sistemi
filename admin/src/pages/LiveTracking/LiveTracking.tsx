import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { couriersApi, ordersApi } from '../../services/api';
import type { Courier, Order, PaginatedResult } from '../../types';

// ─── Leaflet marker icon fix ────────────────────────────────────────────────
// Vite/Webpack ile beraber gelen varsayılan icon path'leri bozuluyor — fallback'i CDN'den ver.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Online kurye için yeşil icon
const onlineIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Offline kurye için gri icon
const offlineIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Sipariş için kırmızı icon
const orderIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const REFETCH_INTERVAL = 10_000;

export default function LiveTracking() {
  const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  // Kuryeleri her 10 saniyede güncelle
  const { data: couriers = [] } = useQuery<Courier[]>({
    queryKey: ['couriers-live'],
    queryFn: () =>
      couriersApi
        .getAll({ page: 1, limit: 200 })
        .then((r) => (r.data as PaginatedResult<Courier>).data),
    refetchInterval: REFETCH_INTERVAL,
  });

  // Aktif siparişleri çek (assigned + picked_up)
  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['orders-live'],
    queryFn: () =>
      ordersApi
        .getAll({ page: 1, limit: 200 })
        .then((r) =>
          (r.data as PaginatedResult<Order>).data.filter(
            (o) => o.status === 'assigned' || o.status === 'picked_up',
          ),
        ),
    refetchInterval: REFETCH_INTERVAL,
  });

  const onlineCouriers = couriers.filter((c) => c.isOnline);
  const offlineCouriers = couriers.filter((c) => !c.isOnline);

  return (
    <div className="-m-4 sm:-m-6 flex flex-col md:flex-row" style={{ height: 'calc(100vh - 64px)' }}>

      {/* ─── Sol Panel ──────────────────────────────────────────────────── */}
      <div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r overflow-y-auto flex-shrink-0 max-h-[50vh] md:max-h-none">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <h2 className="text-lg font-bold text-gray-800">Canlı Takip</h2>
          </div>
          <p className="text-xs text-gray-400">Her 10 saniyede güncellenir</p>
        </div>

        {/* Online Kuryeler */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <h3 className="font-semibold text-gray-700">
              Online ({onlineCouriers.length})
            </h3>
          </div>

          {onlineCouriers.map((courier) => (
            <div
              key={courier.id}
              onClick={() => setSelectedCourier(courier)}
              className={`flex items-center gap-3 p-3 rounded-xl mb-2 cursor-pointer transition-all ${
                selectedCourier?.id === courier.id
                  ? 'bg-purple-50 border border-purple-200'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                {courier.user?.fullName?.charAt(0) ?? 'K'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm truncate">
                  {courier.user?.fullName ?? 'Kurye'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {courier.user?.phone ?? ''}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="w-2 h-2 bg-green-500 rounded-full ml-auto" />
                <p className="text-xs text-gray-400 mt-1">Online</p>
              </div>
            </div>
          ))}

          {onlineCouriers.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">
              Online kurye yok
            </p>
          )}
        </div>

        {/* Aktif Siparişler */}
        <div className="p-4 border-t">
          <h3 className="font-semibold text-gray-700 mb-3">
            Aktif Siparişler ({orders.length})
          </h3>

          {orders.map((order) => (
            <div
              key={order.id}
              className="p-3 bg-orange-50 rounded-xl mb-2 border border-orange-100"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 text-sm">
                    #{order.orderNumber}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {order.customerName}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                    order.status === 'picked_up'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-orange-100 text-orange-600'
                  }`}
                >
                  {order.status === 'picked_up' ? 'Yolda' : 'Atandı'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 truncate">
                📍 {order.deliveryAddress}
              </p>
            </div>
          ))}

          {orders.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">
              Aktif sipariş yok
            </p>
          )}
        </div>

        {/* Offline Kuryeler */}
        <div className="p-4 border-t">
          <h3 className="font-semibold text-gray-500 mb-3 text-sm">
            Offline ({offlineCouriers.length})
          </h3>

          {offlineCouriers.map((courier) => (
            <div
              key={courier.id}
              className="flex items-center gap-3 p-3 rounded-xl mb-2 opacity-50"
            >
              <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {courier.user?.fullName?.charAt(0) ?? 'K'}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-gray-600 text-sm truncate">
                  {courier.user?.fullName ?? 'Kurye'}
                </p>
                <p className="text-xs text-gray-400">Offline</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Harita ─────────────────────────────────────────────────────── */}
      <div className="flex-1 relative min-h-[400px]">
        <MapContainer
          center={[41.0082, 28.9784]}
          zoom={12}
          style={{ position: 'absolute', inset: 0, height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Kurye markerları */}
          {couriers.map((courier) => {
            const lat = courier.latitude;
            const lng = courier.longitude;

            if (lat == null || lng == null) return null;

            return (
              <Marker
                key={courier.id}
                position={[Number(lat), Number(lng)]}
                icon={courier.isOnline ? onlineIcon : offlineIcon}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold">
                      {courier.user?.fullName ?? 'Kurye'}
                    </p>
                    <p
                      className={
                        courier.isOnline ? 'text-green-600' : 'text-gray-400'
                      }
                    >
                      {courier.isOnline ? '🟢 Online' : '⚫ Offline'}
                    </p>
                    <p className="text-gray-500">{courier.user?.phone}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Sipariş delivery noktaları */}
          {orders.map((order) => {
            if (order.deliveryLatitude == null || order.deliveryLongitude == null) {
              return null;
            }

            return (
              <Marker
                key={order.id}
                position={[
                  Number(order.deliveryLatitude),
                  Number(order.deliveryLongitude),
                ]}
                icon={orderIcon}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold">#{order.orderNumber}</p>
                    <p>{order.customerName}</p>
                    <p className="text-gray-500 text-xs">
                      {order.deliveryAddress}
                    </p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Harita üst bilgi (legend) */}
        <div className="absolute top-4 right-4 bg-white rounded-xl shadow-lg p-3 z-[1000]">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span>Online Kurye</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gray-400 rounded-full" />
              <span>Offline</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span>Aktif Sipariş</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
