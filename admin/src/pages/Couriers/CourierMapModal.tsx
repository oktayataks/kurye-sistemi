import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MdClose,
  MdMyLocation,
  MdPlace,
  MdPhone,
  MdContentCopy,
  MdOpenInNew,
} from 'react-icons/md';
import { toast } from 'react-toastify';
import type { Courier } from '../../types';
import { VEHICLE_LABELS } from '../../utils/helpers';

// ─── Leaflet default icon fix (Vite + bundler ortamında) ────────────────────
const courierIcon = L.divIcon({
  className: 'courier-marker',
  html: `
    <div style="
      position: relative;
      width: 36px;
      height: 36px;
    ">
      <div style="
        position: absolute;
        inset: 0;
        background: #6366f1;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        border: 3px solid white;
      "></div>
      <div style="
        position: absolute;
        top: 8px;
        left: 50%;
        transform: translateX(-50%);
        color: white;
        font-size: 14px;
        line-height: 1;
        font-weight: bold;
      ">🛵</div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

interface CourierMapModalProps {
  isOpen: boolean;
  courier: Courier | null;
  onClose: () => void;
}

interface AddressInfo {
  display_name?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
}

export default function CourierMapModal({
  isOpen,
  courier,
  onClose,
}: CourierMapModalProps) {
  const [address, setAddress] = useState<AddressInfo | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  const lat = courier?.latitude ? Number(courier.latitude) : null;
  const lng = courier?.longitude ? Number(courier.longitude) : null;
  const hasLocation = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);

  // ─── Reverse geocoding (OpenStreetMap Nominatim) ──────────────────────────
  useEffect(() => {
    if (!isOpen || !hasLocation) {
      setAddress(null);
      setAddressError(null);
      return;
    }

    const controller = new AbortController();
    setAddressLoading(true);
    setAddressError(null);

    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=tr`,
      {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      },
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setAddress({
          display_name: data.display_name,
          ...data.address,
        });
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setAddressError('Adres bilgisi alınamadı');
        }
      })
      .finally(() => setAddressLoading(false));

    return () => controller.abort();
  }, [isOpen, hasLocation, lat, lng]);

  // ─── ESC ile kapat ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !courier) return null;

  const copyCoords = () => {
    if (!hasLocation) return;
    navigator.clipboard.writeText(`${lat}, ${lng}`);
    toast.success('Koordinatlar kopyalandı');
  };

  const openInMaps = () => {
    if (!hasLocation) return;
    window.open(
      `https://www.google.com/maps?q=${lat},${lng}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <MdMyLocation className="text-indigo-600 text-xl" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {courier.user?.fullName ?? 'Kurye'} — Konum
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    courier.isOnline ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
                {courier.isOnline ? 'Çevrimiçi' : 'Çevrimdışı'} •{' '}
                {VEHICLE_LABELS[courier.vehicleType] ?? courier.vehicleType}
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
          {hasLocation ? (
            <>
              {/* Harita */}
              <div className="relative" style={{ height: 380 }}>
                <MapContainer
                  center={[lat, lng]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[lat, lng]} icon={courierIcon}>
                    <Popup>
                      <div className="text-xs">
                        <p className="font-semibold text-sm mb-1">
                          {courier.user?.fullName ?? 'Kurye'}
                        </p>
                        <p className="text-gray-500">
                          {VEHICLE_LABELS[courier.vehicleType] ?? courier.vehicleType}
                        </p>
                        <p className="text-gray-500">
                          Aktif Sipariş: {courier.currentOrders}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>

              {/* Konum bilgi paneli */}
              <div className="p-5 space-y-4 bg-gray-50/50">
                {/* Adres */}
                <InfoBlock
                  icon={<MdPlace className="text-red-500" />}
                  label="Adres"
                  loading={addressLoading}
                  error={addressError}
                >
                  {address?.display_name ? (
                    <p className="text-sm text-gray-800 leading-relaxed">
                      {address.display_name}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">Adres bulunamadı</p>
                  )}
                  {address && (
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-500">
                      {address.road && (
                        <span><b className="text-gray-700">Cadde:</b> {address.road}</span>
                      )}
                      {(address.neighbourhood || address.suburb) && (
                        <span>
                          <b className="text-gray-700">Mahalle:</b>{' '}
                          {address.neighbourhood ?? address.suburb}
                        </span>
                      )}
                      {address.city && (
                        <span><b className="text-gray-700">Şehir:</b> {address.city}</span>
                      )}
                      {address.postcode && (
                        <span><b className="text-gray-700">Posta:</b> {address.postcode}</span>
                      )}
                    </div>
                  )}
                </InfoBlock>

                {/* Telefon */}
                {courier.user?.phone && (
                  <InfoBlock
                    icon={<MdPhone className="text-indigo-500" />}
                    label="Telefon"
                  >
                    <a
                      href={`tel:${courier.user.phone}`}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      {courier.user.phone}
                    </a>
                  </InfoBlock>
                )}

                {/* Koordinatlar */}
                <InfoBlock
                  icon={<MdMyLocation className="text-green-500" />}
                  label="Koordinatlar"
                >
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs text-gray-700 font-mono bg-white px-2 py-1 rounded border border-gray-200">
                      {lat?.toFixed(6)}, {lng?.toFixed(6)}
                    </code>
                    <div className="flex gap-1">
                      <button
                        onClick={copyCoords}
                        title="Koordinatları kopyala"
                        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <MdContentCopy className="text-base" />
                      </button>
                      <button
                        onClick={openInMaps}
                        title="Google Maps'te aç"
                        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <MdOpenInNew className="text-base" />
                      </button>
                    </div>
                  </div>
                </InfoBlock>
              </div>
            </>
          ) : (
            <div className="px-6 py-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-50 mb-4">
                <MdMyLocation className="text-3xl text-yellow-500" />
              </div>
              <h4 className="text-base font-semibold text-gray-800 mb-1">
                Konum bilgisi yok
              </h4>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                Bu kurye henüz konumunu paylaşmamış. Kurye uygulamasında konum
                gönderdiğinde burada görüntülenecektir.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 flex items-center justify-end gap-2 border-t border-gray-100">
          <button
            type="button"
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

// ─── Yardımcı bileşen ──────────────────────────────────────────────────────────

interface InfoBlockProps {
  icon: React.ReactNode;
  label: string;
  loading?: boolean;
  error?: string | null;
  children: React.ReactNode;
}

function InfoBlock({ icon, label, loading, error, children }: InfoBlockProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base">{icon}</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {label}
        </span>
        {loading && (
          <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
            <span className="h-3 w-3 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
            Yükleniyor
          </span>
        )}
      </div>
      {error ? (
        <p className="text-xs text-red-500">⚠ {error}</p>
      ) : (
        children
      )}
    </div>
  );
}
