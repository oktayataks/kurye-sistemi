import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L, { type LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'react-toastify';
import {
  MdPerson,
  MdPhone,
  MdLocationOn,
  MdAttachMoney,
  MdNotes,
  MdAddShoppingCart,
  MdSearch,
  MdRoomService,
  MdAutoAwesome,
  MdCheckCircle,
  MdLocalShipping,
  MdMyLocation,
  MdStar,
} from 'react-icons/md';

import { ordersApi } from '../../services/api';
import { useMyRestaurant } from '../../hooks/useMyRestaurant';
import Card from '../../components/common/Card';
import Spinner from '../../components/common/Spinner';
import { formatDistance, VEHICLE_LABELS } from '../../utils/helpers';
import type { Courier, Order } from '../../types';

// ─── Custom marker icons ─────────────────────────────────────────────────────

const restaurantIcon = L.divIcon({
  className: 'restaurant-marker',
  html: `
    <div style="position: relative; width: 32px; height: 32px;">
      <div style="position: absolute; inset: 0; background: #ef4444; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 8px #ef444466; border: 2px solid white;"></div>
      <div style="position: absolute; top: 5px; left: 50%; transform: translateX(-50%); font-size: 14px; line-height: 1;">🏪</div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const deliveryIcon = L.divIcon({
  className: 'delivery-marker',
  html: `
    <div style="position: relative; width: 36px; height: 36px;">
      <span style="position: absolute; top: 50%; left: 50%; width: 36px; height: 36px; margin-left: -18px; margin-top: -18px; border-radius: 50%; background: #10b98140; animation: livemap-pulse 2s ease-out infinite;"></span>
      <div style="position: absolute; inset: 0; background: #10b981; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 10px #10b98180; border: 2px solid white;"></div>
      <div style="position: absolute; top: 7px; left: 50%; transform: translateX(-50%); font-size: 16px; line-height: 1;">📍</div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

// ─── Form types ──────────────────────────────────────────────────────────────

interface CreateOrderForm {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  orderTotal: number;
  deliveryFee: number;
  notes: string;
}

interface AssignmentResult {
  order: Order;
  assignedCourier: Courier;
  scores: Array<{
    courier: Courier;
    distanceKm: number;
    distanceScore: number;
    loadScore: number;
    ratingScore: number;
    totalScore: number;
  }>;
  message: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CreateOrder() {
  const navigate = useNavigate();
  const { restaurant, isLoading: isLoadingRestaurant } = useMyRestaurant();

  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [assignmentResult, setAssignmentResult] =
    useState<AssignmentResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [reverseAddress, setReverseAddress] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateOrderForm>({
    defaultValues: {
      customerName: '',
      customerPhone: '',
      deliveryAddress: '',
      deliveryLatitude: null,
      deliveryLongitude: null,
      orderTotal: 0,
      deliveryFee: 0,
      notes: '',
    },
  });

  const lat = watch('deliveryLatitude');
  const lng = watch('deliveryLongitude');
  const hasLocation = lat !== null && lng !== null;

  // ─── Reverse geocoding (lat/lng → adres) ────────────────────────────────────
  useEffect(() => {
    if (lat === null || lng === null) {
      setReverseAddress(null);
      return;
    }
    const ctrl = new AbortController();
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=tr`,
      { signal: ctrl.signal },
    )
      .then((r) => r.json())
      .then((d) => setReverseAddress(d.display_name ?? null))
      .catch(() => setReverseAddress(null));
    return () => ctrl.abort();
  }, [lat, lng]);

  // ─── Adres arama (Nominatim) ────────────────────────────────────────────────
  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=tr&limit=1&accept-language=tr`,
      );
      const data = await res.json();
      if (data.length === 0) {
        toast.warn('Adres bulunamadı, haritada manuel olarak da seçebilirsiniz');
        return;
      }
      const { lat: foundLat, lon: foundLng, display_name } = data[0];
      setValue('deliveryLatitude', Number(foundLat), { shouldValidate: true });
      setValue('deliveryLongitude', Number(foundLng), { shouldValidate: true });
      if (!watch('deliveryAddress')) {
        setValue('deliveryAddress', display_name);
      }
      toast.success('Konum bulundu');
    } catch {
      toast.error('Adres aranamadı');
    } finally {
      setSearchLoading(false);
    }
  };

  // ─── Mutation: sipariş oluştur + otomatik ata ──────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: CreateOrderForm) => {
      if (!restaurant) throw new Error('Restoran bilgisi yüklenmedi');

      // 1) Sipariş oluştur
      const orderRes = await ordersApi.create({
        restaurantId: restaurant.id,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        deliveryAddress: data.deliveryAddress,
        deliveryLatitude: data.deliveryLatitude ?? undefined,
        deliveryLongitude: data.deliveryLongitude ?? undefined,
        orderTotal: Number(data.orderTotal),
        deliveryFee: Number(data.deliveryFee),
        notes: data.notes || undefined,
      });
      const order = orderRes.data as Order;

      // 2) Otomatik kurye ata
      try {
        const assignRes = await ordersApi.assign(order.id);
        return { order, assignment: assignRes.data, success: true };
      } catch (err: any) {
        // Sipariş oluştu ama atama başarısız — yine de kullanıcıya bildir
        return {
          order,
          assignment: null,
          success: false,
          assignError: err.response?.data?.message ?? 'Kurye atanamadı',
        };
      }
    },
    onSuccess: (result) => {
      setCreatedOrderId(result.order.id);
      if (result.success && result.assignment) {
        setAssignmentResult(result.assignment as AssignmentResult);
        toast.success(
          `Sipariş #${result.order.orderNumber} oluşturuldu, kurye atandı!`,
        );
      } else {
        toast.warn(
          `Sipariş #${result.order.orderNumber} oluşturuldu ancak kurye atanamadı: ${result.assignError ?? 'bilinmeyen hata'}`,
        );
      }
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message ?? 'Sipariş oluşturulamadı'),
  });

  // ─── Yeniden başlat ─────────────────────────────────────────────────────────
  const handleNewOrder = () => {
    reset();
    setCreatedOrderId(null);
    setAssignmentResult(null);
    setSearchQuery('');
  };

  // ─── Restaurant yok / loading ──────────────────────────────────────────────
  if (isLoadingRestaurant) {
    return (
      <div className="py-16">
        <Spinner />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <Card className="p-10 text-center">
        <MdRoomService className="mx-auto text-5xl text-gray-300 mb-3" />
        <p className="text-base font-semibold text-gray-700">
          Restoran bilgisi bulunamadı
        </p>
      </Card>
    );
  }

  // ─── Sipariş oluşturuldu ekranı ─────────────────────────────────────────────
  if (createdOrderId) {
    return (
      <SuccessScreen
        orderId={createdOrderId}
        assignment={assignmentResult}
        onNewOrder={handleNewOrder}
        onGoToOrders={() => navigate('/restaurant/my-orders')}
      />
    );
  }

  // ─── Restoran konumu (haritanın merkezi) ───────────────────────────────────
  const restaurantPos: LatLngTuple | null =
    restaurant.latitude && restaurant.longitude
      ? [Number(restaurant.latitude), Number(restaurant.longitude)]
      : null;
  const mapCenter: LatLngTuple = hasLocation
    ? [lat, lng]
    : restaurantPos ?? [41.0082, 28.9784];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <MdAddShoppingCart className="text-orange-600" />
          Yeni Sipariş Oluştur
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Manuel sipariş girişi — kaydedildikten sonra otomatik olarak kurye
          atanır.
        </p>
      </div>

      <form
        onSubmit={handleSubmit((data) => createMutation.mutate(data))}
        className="grid grid-cols-1 lg:grid-cols-2 gap-5"
      >
        {/* Sol: Form */}
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-1">
              <MdPerson className="text-orange-600" />
              Müşteri Bilgileri
            </h3>

            <FormInput
              icon={<MdPerson />}
              label="Müşteri Adı"
              placeholder="Ahmet Yılmaz"
              error={errors.customerName?.message}
              register={register('customerName', {
                required: 'Müşteri adı zorunludur',
                minLength: { value: 2, message: 'En az 2 karakter olmalı' },
              })}
            />

            <FormInput
              icon={<MdPhone />}
              label="Telefon"
              placeholder="05551234567"
              error={errors.customerPhone?.message}
              register={register('customerPhone', {
                required: 'Telefon zorunludur',
                pattern: {
                  value: /^[0-9+\s()-]{10,15}$/,
                  message: 'Geçerli bir telefon numarası girin',
                },
              })}
            />
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-1">
              <MdLocationOn className="text-orange-600" />
              Teslimat Adresi
            </h3>

            <FormTextarea
              label="Adres"
              placeholder="Mahalle, sokak, bina no, daire..."
              error={errors.deliveryAddress?.message}
              register={register('deliveryAddress', {
                required: 'Adres zorunludur',
                minLength: { value: 5, message: 'En az 5 karakter olmalı' },
              })}
            />

            {/* Adres → koordinat arama */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Adres ile konum bul
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch(searchQuery);
                      }
                    }}
                    placeholder="ör: Bağcılar, İstanbul"
                    className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSearch(searchQuery)}
                  disabled={!searchQuery.trim() || searchLoading}
                  className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {searchLoading ? '...' : 'Ara'}
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5 leading-snug">
                💡 Haritada herhangi bir noktaya tıklayarak da konum
                seçebilirsiniz.
              </p>
            </div>

            {/* Koordinatlar */}
            {hasLocation ? (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase text-green-700">
                    Konum Seçildi
                  </p>
                  <p className="text-xs font-mono text-gray-700">
                    {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
                  </p>
                  {reverseAddress && (
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                      {reverseAddress}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setValue('deliveryLatitude', null);
                    setValue('deliveryLongitude', null);
                  }}
                  className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded font-medium"
                >
                  Temizle
                </button>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2.5 text-xs text-yellow-800">
                ⚠️ Konum seçilmedi — otomatik kurye ataması yapılamayabilir
              </div>
            )}
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-1">
              <MdAttachMoney className="text-orange-600" />
              Ödeme & Notlar
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <FormInput
                icon={<MdAttachMoney />}
                label="Sipariş Tutarı (₺)"
                type="number"
                step="0.01"
                placeholder="150.00"
                error={errors.orderTotal?.message}
                register={register('orderTotal', {
                  required: 'Tutar zorunludur',
                  min: { value: 0.01, message: 'En az 0.01 olmalı' },
                  valueAsNumber: true,
                })}
              />
              <FormInput
                icon={<MdLocalShipping />}
                label="Teslimat Ücreti (₺)"
                type="number"
                step="0.01"
                placeholder="15.00"
                error={errors.deliveryFee?.message}
                register={register('deliveryFee', {
                  min: { value: 0, message: 'Negatif olamaz' },
                  valueAsNumber: true,
                })}
              />
            </div>

            <FormTextarea
              icon={<MdNotes />}
              label="Notlar (opsiyonel)"
              placeholder="ör: Zile basmayın, kapıyı çalın"
              error={errors.notes?.message}
              register={register('notes', {
                maxLength: {
                  value: 500,
                  message: 'En fazla 500 karakter',
                },
              })}
            />
          </Card>
        </div>

        {/* Sağ: Harita */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <MdMyLocation className="text-orange-600" />
                Teslimat Konumu
              </h3>
              {hasLocation && (
                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <MdCheckCircle />
                  Seçildi
                </span>
              )}
            </div>

            <div style={{ height: 480 }}>
              <MapContainer
                center={mapCenter}
                zoom={hasLocation ? 14 : 12}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <ClickHandler
                  onClick={(latlng) => {
                    setValue('deliveryLatitude', latlng.lat, {
                      shouldValidate: true,
                    });
                    setValue('deliveryLongitude', latlng.lng, {
                      shouldValidate: true,
                    });
                  }}
                />

                <RecenterOnLocation lat={lat} lng={lng} />

                {/* Restoran marker */}
                {restaurantPos && (
                  <Marker position={restaurantPos} icon={restaurantIcon} />
                )}

                {/* Teslimat marker */}
                {hasLocation && (
                  <Marker position={[lat, lng]} icon={deliveryIcon} />
                )}
              </MapContainer>
            </div>

            <div className="bg-gray-50 px-5 py-2.5 text-[11px] text-gray-600 flex items-center justify-around">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full" />
                Restoran
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full" />
                Teslimat
              </span>
              <span className="text-gray-400">Tıkla → konum seç</span>
            </div>
          </Card>

          {/* Kurye Çağır */}
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 disabled:opacity-50 text-white font-semibold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-base"
          >
            {createMutation.isPending ? (
              <>
                <span className="h-5 w-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Sipariş oluşturuluyor & kurye aranıyor...
              </>
            ) : (
              <>
                <MdAutoAwesome className="text-xl" />
                Kurye Çağır
              </>
            )}
          </button>
          <p className="text-[11px] text-gray-500 text-center">
            Sipariş kaydedilecek ve algoritma otomatik olarak en uygun kuryeyi
            atayacak.
          </p>
        </div>
      </form>
    </div>
  );
}

// ─── Form Input ──────────────────────────────────────────────────────────────

interface FormInputProps {
  icon?: React.ReactNode;
  label: string;
  placeholder?: string;
  type?: string;
  step?: string;
  error?: string;
  register: any;
}

function FormInput({
  icon,
  label,
  placeholder,
  type = 'text',
  step,
  error,
  register,
}: FormInputProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
            {icon}
          </span>
        )}
        <input
          type={type}
          step={step}
          placeholder={placeholder}
          className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all ${
            error
              ? 'border-red-300 bg-red-50 focus:ring-red-300'
              : 'border-gray-200 bg-white focus:ring-orange-400 focus:border-orange-400'
          }`}
          {...register}
        />
      </div>
      {error && (
        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

interface FormTextareaProps {
  icon?: React.ReactNode;
  label: string;
  placeholder?: string;
  error?: string;
  register: any;
}

function FormTextarea({
  icon,
  label,
  placeholder,
  error,
  register,
}: FormTextareaProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
        {icon}
        {label}
      </label>
      <textarea
        rows={3}
        placeholder={placeholder}
        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all resize-none ${
          error
            ? 'border-red-300 bg-red-50 focus:ring-red-300'
            : 'border-gray-200 bg-white focus:ring-orange-400 focus:border-orange-400'
        }`}
        {...register}
      />
      {error && (
        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

// ─── Map handlers ────────────────────────────────────────────────────────────

function ClickHandler({
  onClick,
}: {
  onClick: (latlng: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function RecenterOnLocation({
  lat,
  lng,
}: {
  lat: number | null;
  lng: number | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (lat !== null && lng !== null) {
      map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.5 });
    }
  }, [lat, lng, map]);
  return null;
}

// ─── Success Screen ──────────────────────────────────────────────────────────

interface SuccessScreenProps {
  orderId: string;
  assignment: AssignmentResult | null;
  onNewOrder: () => void;
  onGoToOrders: () => void;
}

function SuccessScreen({
  orderId: _orderId,
  assignment,
  onNewOrder,
  onGoToOrders,
}: SuccessScreenProps) {
  const sortedScores = useMemo(
    () =>
      assignment?.scores
        ? [...assignment.scores].sort((a, b) => b.totalScore - a.totalScore)
        : [],
    [assignment],
  );
  const best = sortedScores[0];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-8 text-center text-white">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-3">
            <MdCheckCircle className="text-4xl" />
          </div>
          <h2 className="text-2xl font-bold">Sipariş Oluşturuldu!</h2>
          {assignment && (
            <p className="text-green-100 text-sm mt-1.5">
              #{assignment.order.orderNumber} • Kurye atandı
            </p>
          )}
        </div>

        {assignment && best ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4 bg-orange-50/50 border border-orange-100 rounded-xl p-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                {(assignment.assignedCourier.user?.fullName ?? '?')
                  .charAt(0)
                  .toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Atanan Kurye
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {assignment.assignedCourier.user?.fullName}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <MdLocalShipping />
                    {VEHICLE_LABELS[assignment.assignedCourier.vehicleType]}
                  </span>
                  {assignment.assignedCourier.user?.phone && (
                    <span className="flex items-center gap-1">
                      <MdPhone className="text-sm" />
                      {assignment.assignedCourier.user.phone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MdStar className="text-yellow-400" />
                    {Number(assignment.assignedCourier.rating).toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase">Toplam Skor</p>
                <p className="text-xl font-bold text-green-600">
                  {(best.totalScore * 100).toFixed(0)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <ScorePill
                label="Mesafe"
                detail={formatDistance(best.distanceKm)}
                value={best.distanceScore}
                color="indigo"
              />
              <ScorePill
                label="İş Yükü"
                detail={`${best.courier.currentOrders} sipariş`}
                value={best.loadScore}
                color="purple"
              />
              <ScorePill
                label="Rating"
                detail={`${Number(best.courier.rating).toFixed(1)} ⭐`}
                value={best.ratingScore}
                color="yellow"
              />
            </div>

            {sortedScores.length > 1 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-500 hover:text-gray-700 font-medium">
                  Diğer adaylar ({sortedScores.length - 1})
                </summary>
                <div className="mt-2 space-y-1">
                  {sortedScores.slice(1).map((s, idx) => (
                    <div
                      key={s.courier.id}
                      className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded-md"
                    >
                      <span className="text-gray-400 font-mono w-5">
                        #{idx + 2}
                      </span>
                      <span className="font-medium text-gray-700 flex-1 truncate">
                        {s.courier.user?.fullName ?? '—'}
                      </span>
                      <span className="text-gray-500">
                        {formatDistance(s.distanceKm)}
                      </span>
                      <span className="font-bold text-gray-700 w-10 text-right">
                        {(s.totalScore * 100).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ) : (
          <div className="p-6 text-center">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
              ⚠️ Sipariş kaydedildi ancak otomatik atama başarısız oldu. Manuel
              olarak siparişlere gidip kurye atayabilirsiniz.
            </div>
          </div>
        )}
      </Card>

      <div className="flex gap-2">
        <button
          onClick={onNewOrder}
          className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <MdAddShoppingCart />
          Yeni Sipariş
        </button>
        <button
          onClick={onGoToOrders}
          className="flex-1 px-4 py-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl border border-gray-200 transition-colors"
        >
          Siparişlerime Git
        </button>
      </div>
    </div>
  );
}

interface ScorePillProps {
  label: string;
  detail: string;
  value: number;
  color: 'indigo' | 'purple' | 'yellow';
}

function ScorePill({ label, detail, value, color }: ScorePillProps) {
  const colorMap = {
    indigo: 'bg-indigo-500',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-500',
  };
  const pct = Math.round(value * 100);
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-2.5">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-base font-bold text-gray-800 mt-0.5">{pct}</p>
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden my-1">
        <div
          className={`h-full ${colorMap[color]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-400 truncate">{detail}</p>
    </div>
  );
}
