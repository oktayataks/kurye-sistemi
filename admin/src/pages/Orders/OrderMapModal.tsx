import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L, { type LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MdClose, MdMap } from 'react-icons/md';
import type { Order } from '../../types';
import { haversineDistance, formatDistance } from '../../utils/helpers';

// ─── Custom marker icons ─────────────────────────────────────────────────────

function makeIcon(color: string, emoji: string) {
  return L.divIcon({
    className: 'order-marker',
    html: `
      <div style="position: relative; width: 36px; height: 36px;">
        <div style="
          position: absolute; inset: 0;
          background: ${color};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 12px ${color}66;
          border: 3px solid white;
        "></div>
        <div style="
          position: absolute; top: 7px; left: 50%;
          transform: translateX(-50%);
          font-size: 16px; line-height: 1;
        ">${emoji}</div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

const ICONS = {
  restaurant: makeIcon('#10b981', '🏪'),
  delivery: makeIcon('#ef4444', '🏠'),
  courier: makeIcon('#6366f1', '🛵'),
};

interface OrderMapModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
}

export default function OrderMapModal({ isOpen, order, onClose }: OrderMapModalProps) {
  const [deliveryAddress, setDeliveryAddress] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);

  // ─── Koordinatları parse et ──────────────────────────────────────────────────
  const points = useMemo(() => {
    if (!order) return null;

    const restaurantLat = order.restaurant?.latitude
      ? Number(order.restaurant.latitude)
      : null;
    const restaurantLng = order.restaurant?.longitude
      ? Number(order.restaurant.longitude)
      : null;
    const deliveryLat = order.deliveryLatitude
      ? Number(order.deliveryLatitude)
      : null;
    const deliveryLng = order.deliveryLongitude
      ? Number(order.deliveryLongitude)
      : null;
    const courierLat = order.courier?.latitude
      ? Number(order.courier.latitude)
      : null;
    const courierLng = order.courier?.longitude
      ? Number(order.courier.longitude)
      : null;

    return {
      restaurant:
        restaurantLat !== null && restaurantLng !== null
          ? ([restaurantLat, restaurantLng] as LatLngTuple)
          : null,
      delivery:
        deliveryLat !== null && deliveryLng !== null
          ? ([deliveryLat, deliveryLng] as LatLngTuple)
          : null,
      courier:
        courierLat !== null && courierLng !== null
          ? ([courierLat, courierLng] as LatLngTuple)
          : null,
    };
  }, [order]);

  // ─── Harita merkezi ve sınırları ────────────────────────────────────────────
  const allPoints = useMemo(() => {
    if (!points) return [];
    return [points.restaurant, points.delivery, points.courier].filter(
      (p): p is LatLngTuple => p !== null,
    );
  }, [points]);

  const center = useMemo<LatLngTuple>(() => {
    if (allPoints.length === 0) return [41.0082, 28.9784]; // İstanbul varsayılan
    if (allPoints.length === 1) return allPoints[0];

    const avgLat = allPoints.reduce((s, p) => s + p[0], 0) / allPoints.length;
    const avgLng = allPoints.reduce((s, p) => s + p[1], 0) / allPoints.length;
    return [avgLat, avgLng];
  }, [allPoints]);

  // ─── Reverse geocoding (teslimat adresi için) ───────────────────────────────
  useEffect(() => {
    if (!isOpen || !points?.delivery) {
      setDeliveryAddress(null);
      return;
    }

    const controller = new AbortController();
    setAddressLoading(true);

    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${points.delivery[0]}&lon=${points.delivery[1]}&accept-language=tr`,
      { signal: controller.signal },
    )
      .then((r) => r.json())
      .then((data) => setDeliveryAddress(data.display_name ?? null))
      .catch(() => setDeliveryAddress(null))
      .finally(() => setAddressLoading(false));

    return () => controller.abort();
  }, [isOpen, points?.delivery]);

  // ─── ESC ile kapat ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !order || !points) return null;

  // ─── Mesafe hesapla ─────────────────────────────────────────────────────────
  const restaurantToDelivery =
    points.restaurant && points.delivery
      ? haversineDistance(
          points.restaurant[0],
          points.restaurant[1],
          points.delivery[0],
          points.delivery[1],
        )
      : null;

  const courierToRestaurant =
    points.courier && points.restaurant
      ? haversineDistance(
          points.courier[0],
          points.courier[1],
          points.restaurant[0],
          points.restaurant[1],
        )
      : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <MdMap className="text-indigo-600 text-xl" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Sipariş #{order.orderNumber} — Konum
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Restoran, teslimat noktası ve kurye konumu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
          >
            <MdClose className="text-lg" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {allPoints.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <MdMap className="mx-auto text-5xl text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">
                Bu sipariş için konum bilgisi bulunamadı.
              </p>
            </div>
          ) : (
            <>
              {/* Harita */}
              <div style={{ height: 420 }}>
                <MapContainer
                  center={center}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {points.restaurant && (
                    <Marker position={points.restaurant} icon={ICONS.restaurant}>
                      <Popup>
                        <div className="text-xs">
                          <p className="font-semibold mb-1">🏪 Restoran</p>
                          <p>{order.restaurant?.name}</p>
                          <p className="text-gray-500">{order.restaurant?.address}</p>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {points.delivery && (
                    <Marker position={points.delivery} icon={ICONS.delivery}>
                      <Popup>
                        <div className="text-xs">
                          <p className="font-semibold mb-1">🏠 Teslimat Noktası</p>
                          <p>{order.customerName}</p>
                          <p className="text-gray-500">{order.deliveryAddress}</p>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {points.courier && (
                    <Marker position={points.courier} icon={ICONS.courier}>
                      <Popup>
                        <div className="text-xs">
                          <p className="font-semibold mb-1">🛵 Kurye</p>
                          <p>{order.courier?.user?.fullName ?? 'Kurye'}</p>
                          {order.courier?.isOnline && (
                            <p className="text-green-600 mt-0.5">● Çevrimiçi</p>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Restoran → Teslimat çizgisi */}
                  {points.restaurant && points.delivery && (
                    <Polyline
                      positions={[points.restaurant, points.delivery]}
                      pathOptions={{
                        color: '#ef4444',
                        weight: 3,
                        opacity: 0.6,
                        dashArray: '8, 6',
                      }}
                    />
                  )}

                  {/* Kurye → Restoran çizgisi (kuryenin gideceği rota) */}
                  {points.courier && points.restaurant && (
                    <Polyline
                      positions={[points.courier, points.restaurant]}
                      pathOptions={{
                        color: '#6366f1',
                        weight: 3,
                        opacity: 0.5,
                        dashArray: '4, 4',
                      }}
                    />
                  )}
                </MapContainer>
              </div>

              {/* Alt bilgi paneli */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-5 bg-gray-50/50">
                <LegendCard
                  color="#10b981"
                  emoji="🏪"
                  title="Restoran"
                  subtitle={order.restaurant?.name ?? '—'}
                  detail={order.restaurant?.address ?? null}
                />
                <LegendCard
                  color="#ef4444"
                  emoji="🏠"
                  title="Teslimat"
                  subtitle={order.customerName}
                  detail={
                    addressLoading
                      ? 'Adres yükleniyor...'
                      : deliveryAddress ?? order.deliveryAddress
                  }
                />
                <LegendCard
                  color="#6366f1"
                  emoji="🛵"
                  title="Kurye"
                  subtitle={order.courier?.user?.fullName ?? 'Atanmadı'}
                  detail={
                    order.courier
                      ? `${order.courier.isOnline ? '● Çevrimiçi' : '○ Çevrimdışı'}`
                      : 'Henüz atanmadı'
                  }
                />
              </div>

              {/* Mesafe özeti */}
              {(restaurantToDelivery !== null || courierToRestaurant !== null) && (
                <div className="px-5 py-3 bg-white border-t border-gray-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                  {restaurantToDelivery !== null && (
                    <div>
                      <span className="text-gray-500">Restoran → Teslimat:</span>
                      <span className="ml-1.5 font-semibold text-gray-800">
                        {formatDistance(restaurantToDelivery)}
                      </span>
                    </div>
                  )}
                  {courierToRestaurant !== null && (
                    <div>
                      <span className="text-gray-500">Kurye → Restoran:</span>
                      <span className="ml-1.5 font-semibold text-gray-800">
                        {formatDistance(courierToRestaurant)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 flex items-center justify-end gap-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

interface LegendCardProps {
  color: string;
  emoji: string;
  title: string;
  subtitle: string;
  detail: string | null;
}

function LegendCard({ color, emoji, title, subtitle, detail }: LegendCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-sm"
          style={{ backgroundColor: `${color}20` }}
        >
          {emoji}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
          {title}
        </span>
      </div>
      <p className="text-sm font-medium text-gray-900 truncate">{subtitle}</p>
      {detail && (
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{detail}</p>
      )}
    </div>
  );
}
