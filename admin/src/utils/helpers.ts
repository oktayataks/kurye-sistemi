import type { OrderStatus } from '../types';

export const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Bekliyor',
  assigned: 'Atandı',
  picked_up: 'Teslim Alındı',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  assigned: 'bg-blue-100 text-blue-800',
  picked_up: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export const VEHICLE_LABELS: Record<string, string> = {
  bike: 'Bisiklet',
  motorbike: 'Motor',
  car: 'Araba',
};

// Şehir içi ortalama hız varsayımları (trafik dahil)
export const VEHICLE_AVG_SPEED_KMH: Record<string, number> = {
  bike: 15,
  motorbike: 35,
  car: 30,
};

/**
 * Mesafe (km) ve araç tipine göre tahmini varış süresini dakika cinsinden hesaplar.
 * Hazırlık + son metre yürüme için sabit 3 dakika tampon eklenir.
 */
export function estimateEtaMinutes(km: number, vehicleType: string): number {
  const speed = VEHICLE_AVG_SPEED_KMH[vehicleType] ?? 25;
  const travelMin = (km / speed) * 60;
  return Math.max(1, Math.round(travelMin + 3));
}

export function formatEta(minutes: number): string {
  if (minutes < 60) return `~${minutes} dk`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `~${h} sa` : `~${h} sa ${m} dk`;
}

/**
 * Haversine formülü — iki koordinat arasındaki mesafeyi km cinsinden döner.
 * Backend'deki AssignmentService.haversineDistance ile aynı.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.asin(Math.sqrt(a));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return 'az önce';
  if (diffMin < 60) return `${diffMin} dk önce`;
  if (diffHour < 24) return `${diffHour} saat önce`;
  if (diffDay < 7) return `${diffDay} gün önce`;
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
