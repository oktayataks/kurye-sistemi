import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { IconType } from 'react-icons';
import {
  MdClose,
  MdPersonSearch,
  MdAutoAwesome,
  MdLocationOn,
  MdStar,
  MdLocalShipping,
  MdCheckCircle,
  MdInfoOutline,
  MdSpeed,
  MdAccessTime,
  MdDirectionsBike,
  MdTwoWheeler,
  MdDirectionsCar,
  MdArrowForward,
} from 'react-icons/md';
import { couriersApi } from '../../services/api';
import type { Courier, Order, PaginatedResult } from '../../types';
import {
  haversineDistance,
  formatDistance,
  estimateEtaMinutes,
  formatEta,
  VEHICLE_LABELS,
} from '../../utils/helpers';

// Araç tipine özel ikonlar
const VEHICLE_ICONS: Record<string, IconType> = {
  bike: MdDirectionsBike,
  motorbike: MdTwoWheeler,
  car: MdDirectionsCar,
};

interface CourierWithDistance {
  courier: Courier;
  distanceKm: number | null;
}

export interface AssignmentScore {
  courier: Courier;
  distanceKm: number;
  distanceScore: number;
  loadScore: number;
  ratingScore: number;
  totalScore: number;
}

export interface AutoAssignmentResult {
  assignedCourier: Courier;
  scores: AssignmentScore[];
  message: string;
}

interface AssignCourierModalProps {
  isOpen: boolean;
  order: Order | null;
  isManualSubmitting?: boolean;
  isAutoAssigning?: boolean;
  autoResult?: AutoAssignmentResult | null;
  onClose: () => void;
  onManualAssign: (courierId: string) => void;
  onAutoAssign: () => void;
  onResetAutoResult?: () => void;
}

type Tab = 'manual' | 'auto';

export default function AssignCourierModal({
  isOpen,
  order,
  isManualSubmitting = false,
  isAutoAssigning = false,
  autoResult = null,
  onClose,
  onManualAssign,
  onAutoAssign,
  onResetAutoResult,
}: AssignCourierModalProps) {
  const [tab, setTab] = useState<Tab>('manual');
  // Hangi kurye için "Ata" butonuna basıldı (kart içinde spinner için)
  const [pendingCourierId, setPendingCourierId] = useState<string | null>(null);

  // ─── Online kuryeleri çek ───────────────────────────────────────────────────
  const { data: couriersData, isLoading: couriersLoading } = useQuery({
    queryKey: ['couriers', 'online-for-assignment'],
    queryFn: () =>
      couriersApi
        .getAll({ page: 1, limit: 100, isOnline: true })
        .then((r) => r.data as PaginatedResult<Courier>),
    enabled: isOpen,
  });

  // ─── Kuryeleri mesafeye göre sırala ─────────────────────────────────────────
  const sortedCouriers = useMemo<CourierWithDistance[]>(() => {
    if (!couriersData?.data || !order?.restaurant) return [];

    const restLat = order.restaurant.latitude
      ? Number(order.restaurant.latitude)
      : null;
    const restLng = order.restaurant.longitude
      ? Number(order.restaurant.longitude)
      : null;

    return couriersData.data
      .map<CourierWithDistance>((c) => {
        const cLat = c.latitude != null ? Number(c.latitude) : null;
        const cLng = c.longitude != null ? Number(c.longitude) : null;

        let distanceKm: number | null = null;
        if (restLat !== null && restLng !== null && cLat !== null && cLng !== null) {
          distanceKm = haversineDistance(cLat, cLng, restLat, restLng);
        }
        return { courier: c, distanceKm };
      })
      .sort((a, b) => {
        // Mesafesi olanlar üstte, sonra mesafeye göre artan
        if (a.distanceKm === null && b.distanceKm === null) return 0;
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
  }, [couriersData, order]);

  // ─── Modal açıldığında reset ────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setTab('manual');
      setPendingCourierId(null);
    }
  }, [isOpen, order?.id]);

  // Mutation tamamlandığında pending'i temizle
  useEffect(() => {
    if (!isManualSubmitting) setPendingCourierId(null);
  }, [isManualSubmitting]);

  const handleAssignCourier = (courierId: string) => {
    setPendingCourierId(courierId);
    onManualAssign(courierId);
  };

  // ─── ESC ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isManualSubmitting && !isAutoAssigning) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isManualSubmitting, isAutoAssigning, onClose]);

  if (!isOpen || !order) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={() => !isManualSubmitting && !isAutoAssigning && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <MdLocalShipping className="text-indigo-600 text-xl" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Kurye Ata</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Sipariş #{order.orderNumber} •{' '}
                {order.restaurant?.name ?? 'Restoran'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isManualSubmitting || isAutoAssigning}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors disabled:opacity-40"
          >
            <MdClose className="text-lg" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/50">
          <TabButton
            active={tab === 'manual'}
            onClick={() => {
              setTab('manual');
              onResetAutoResult?.();
            }}
            icon={<MdPersonSearch className="text-base" />}
            label="Manuel Seç"
          />
          <TabButton
            active={tab === 'auto'}
            onClick={() => setTab('auto')}
            icon={<MdAutoAwesome className="text-base" />}
            label="Otomatik Ata"
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'manual' ? (
            <ManualTab
              loading={couriersLoading}
              couriers={sortedCouriers}
              pendingCourierId={pendingCourierId}
              isSubmitting={isManualSubmitting}
              onAssign={handleAssignCourier}
            />
          ) : (
            <AutoTab
              order={order}
              loading={isAutoAssigning}
              result={autoResult}
              onRun={onAutoAssign}
            />
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 flex items-center justify-end gap-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isManualSubmitting || isAutoAssigning}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40"
          >
            {autoResult ? 'Kapat' : 'İptal'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab Button ──────────────────────────────────────────────────────────────

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
        active
          ? 'text-indigo-600 border-b-2 border-indigo-500 bg-white'
          : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Manual Tab ──────────────────────────────────────────────────────────────

interface ManualTabProps {
  loading: boolean;
  couriers: CourierWithDistance[];
  pendingCourierId: string | null;
  isSubmitting: boolean;
  onAssign: (courierId: string) => void;
}

function ManualTab({
  loading,
  couriers,
  pendingCourierId,
  isSubmitting,
  onAssign,
}: ManualTabProps) {
  if (loading) {
    return (
      <div className="px-6 py-16 text-center">
        <div className="inline-block h-8 w-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-sm text-gray-500 mt-3">Kuryeler yükleniyor...</p>
      </div>
    );
  }

  if (couriers.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <MdPersonSearch className="mx-auto text-5xl text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-700 mb-1">
          Çevrimiçi kurye bulunamadı
        </p>
        <p className="text-xs text-gray-500">
          Şu anda atama yapılabilecek aktif kurye yok.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
        <span>{couriers.length} çevrimiçi kurye • mesafeye göre sıralı</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          Online
        </span>
      </div>

      {couriers.map(({ courier, distanceKm }, idx) => (
        <CourierCard
          key={courier.id}
          courier={courier}
          distanceKm={distanceKm}
          isNearest={idx === 0 && distanceKm !== null}
          isPending={pendingCourierId === courier.id}
          isAnyPending={isSubmitting}
          onAssign={() => onAssign(courier.id)}
        />
      ))}
    </div>
  );
}

interface CourierCardProps {
  courier: Courier;
  distanceKm: number | null;
  isNearest: boolean;
  isPending: boolean;
  isAnyPending: boolean;
  onAssign: () => void;
}

function CourierCard({
  courier,
  distanceKm,
  isNearest,
  isPending,
  isAnyPending,
  onAssign,
}: CourierCardProps) {
  const VehicleIcon = VEHICLE_ICONS[courier.vehicleType] ?? MdLocalShipping;
  const etaMin =
    distanceKm !== null
      ? estimateEtaMinutes(distanceKm, courier.vehicleType)
      : null;
  const disabled = isAnyPending && !isPending;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
        isPending
          ? 'border-indigo-500 bg-indigo-50/70 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center">
          <span className="text-base font-semibold text-indigo-700">
            {(courier.user?.fullName ?? '?').charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {courier.user?.fullName ?? 'İsimsiz Kurye'}
          </p>
          {isNearest && (
            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded uppercase tracking-wide">
              En Yakın
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <VehicleIcon className="text-base text-indigo-500" />
            {VEHICLE_LABELS[courier.vehicleType]}
          </span>
          <span className="flex items-center gap-1">
            <MdStar className="text-yellow-400 text-sm" />
            {Number(courier.rating).toFixed(1)}
          </span>
          <span className="text-gray-400">
            {courier.currentOrders} aktif sipariş
          </span>
        </div>
      </div>

      {/* Mesafe & ETA */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0 min-w-[68px]">
        {distanceKm !== null ? (
          <>
            <span className="flex items-center gap-1 text-xs font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded-md">
              <MdLocationOn className="text-indigo-500" />
              {formatDistance(distanceKm)}
            </span>
            {etaMin !== null && (
              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                <MdAccessTime className="text-sm" />
                {formatEta(etaMin)}
              </span>
            )}
          </>
        ) : (
          <span className="text-[10px] text-gray-400 italic">Konum yok</span>
        )}
      </div>

      {/* Ata butonu */}
      <button
        type="button"
        onClick={onAssign}
        disabled={isAnyPending}
        className={`flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all flex-shrink-0 ${
          isPending
            ? 'bg-indigo-600 text-white'
            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white'
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {isPending ? (
          <>
            <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Atanıyor
          </>
        ) : (
          <>
            Ata
            <MdArrowForward className="text-sm" />
          </>
        )}
      </button>
    </div>
  );
}

// ─── Auto Tab ────────────────────────────────────────────────────────────────

interface AutoTabProps {
  order: Order;
  loading: boolean;
  result: AutoAssignmentResult | null;
  onRun: () => void;
}

function AutoTab({ order, loading, result, onRun }: AutoTabProps) {
  // Sonuç gösterimi
  if (result) {
    return <AutoResult result={result} />;
  }

  return (
    <div className="px-6 py-10 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 mb-4">
        <MdAutoAwesome className="text-3xl text-indigo-600" />
      </div>
      <h4 className="text-base font-semibold text-gray-900 mb-1">
        Akıllı Kurye Eşleştirme
      </h4>
      <p className="text-xs text-gray-500 max-w-md mx-auto mb-6">
        Sistem en uygun çevrimiçi kuryeyi <strong>mesafe (50%)</strong>,{' '}
        <strong>iş yükü (30%)</strong> ve <strong>rating (20%)</strong>{' '}
        ağırlıklarıyla bulur.
      </p>

      {/* Algoritma açıklaması */}
      <div className="grid grid-cols-3 gap-2 max-w-md mx-auto mb-6">
        <FactorBox
          icon={<MdLocationOn />}
          label="Mesafe"
          weight="%50"
          color="bg-indigo-50 text-indigo-600"
        />
        <FactorBox
          icon={<MdSpeed />}
          label="Yük"
          weight="%30"
          color="bg-purple-50 text-purple-600"
        />
        <FactorBox
          icon={<MdStar />}
          label="Rating"
          weight="%20"
          color="bg-yellow-50 text-yellow-600"
        />
      </div>

      {/* Çalıştır */}
      <button
        type="button"
        onClick={onRun}
        disabled={loading || !order.restaurant?.latitude}
        className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Algoritma çalışıyor...
          </>
        ) : (
          <>
            <MdAutoAwesome />
            Algoritmayı Çalıştır
          </>
        )}
      </button>

      {!order.restaurant?.latitude && (
        <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mt-4 max-w-md mx-auto">
          ⚠️ Restoranın konum bilgisi eksik — otomatik atama yapılamaz.
        </p>
      )}
    </div>
  );
}

interface FactorBoxProps {
  icon: React.ReactNode;
  label: string;
  weight: string;
  color: string;
}

function FactorBox({ icon, label, weight, color }: FactorBoxProps) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-3 text-center">
      <div
        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${color} mb-1.5 text-base`}
      >
        {icon}
      </div>
      <p className="text-xs font-semibold text-gray-700">{label}</p>
      <p className="text-[10px] text-gray-500">{weight}</p>
    </div>
  );
}

// ─── Auto Result ─────────────────────────────────────────────────────────────

function AutoResult({ result }: { result: AutoAssignmentResult }) {
  const { assignedCourier, scores } = result;
  const sortedScores = [...scores].sort((a, b) => b.totalScore - a.totalScore);
  const bestScore = sortedScores[0];

  return (
    <div className="p-4 space-y-4">
      {/* Başarı kartı */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <MdCheckCircle className="text-green-600 text-2xl" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-900">
              Kurye Başarıyla Atandı
            </p>
            <p className="text-xs text-green-700 mt-0.5">
              {sortedScores.length} aday arasından en yüksek skor seçildi
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
            {(assignedCourier.user?.fullName ?? '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">
              {assignedCourier.user?.fullName ?? 'Kurye'}
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
              <span>{VEHICLE_LABELS[assignedCourier.vehicleType]}</span>
              <span className="flex items-center gap-1">
                <MdStar className="text-yellow-400" />
                {Number(assignedCourier.rating).toFixed(1)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Toplam Skor</p>
            <p className="text-lg font-bold text-green-600">
              {(bestScore.totalScore * 100).toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      {/* Neden bu kurye? */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MdInfoOutline className="text-gray-400" />
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Neden Bu Kurye Seçildi?
          </h4>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <ScoreBar
            label="Mesafe"
            value={bestScore.distanceScore}
            detail={formatDistance(bestScore.distanceKm)}
            color="indigo"
          />
          <ScoreBar
            label="Yük"
            value={bestScore.loadScore}
            detail={`${bestScore.courier.currentOrders} sipariş`}
            color="purple"
          />
          <ScoreBar
            label="Rating"
            value={bestScore.ratingScore}
            detail={`${Number(bestScore.courier.rating).toFixed(1)} ⭐`}
            color="yellow"
          />
        </div>
      </div>

      {/* Diğer Adaylar */}
      {sortedScores.length > 1 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Diğer Adaylar ({sortedScores.length - 1})
          </h4>
          <div className="space-y-1.5">
            {sortedScores.slice(1).map((s) => (
              <div
                key={s.courier.id}
                className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg text-xs"
              >
                <span className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center text-[10px] font-semibold text-gray-500 flex-shrink-0">
                  #{sortedScores.indexOf(s) + 1}
                </span>
                <span className="font-medium text-gray-700 flex-1 truncate">
                  {s.courier.user?.fullName ?? 'İsimsiz'}
                </span>
                <span className="text-gray-500">
                  {formatDistance(s.distanceKm)}
                </span>
                <span className="font-bold text-gray-700 w-10 text-right">
                  {(s.totalScore * 100).toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ScoreBarProps {
  label: string;
  value: number; // 0-1
  detail: string;
  color: 'indigo' | 'purple' | 'yellow';
}

function ScoreBar({ label, value, detail, color }: ScoreBarProps) {
  const pct = Math.round(value * 100);
  const colorMap = {
    indigo: 'bg-indigo-500',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-500',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
          {label}
        </span>
        <span className="text-xs font-bold text-gray-800">{pct}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
        <div
          className={`h-full ${colorMap[color]} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-500 truncate">{detail}</p>
    </div>
  );
}
