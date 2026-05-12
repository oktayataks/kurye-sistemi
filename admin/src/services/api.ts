import axios, { type AxiosResponse, type AxiosError } from 'axios';
import { toast } from 'react-toastify';
import type {
  AuthResponse,
  User,
  Restaurant,
  Courier,
  Order,
  OrderStatus,
  PaginatedResult,
} from '../types';

// ─── Token Yönetimi ─────────────────────────────────────────────────────────

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  remove: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

// ─── Axios Instance ──────────────────────────────────────────────────────────

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// Request interceptor: her isteğe token ekle
api.interceptors.request.use(
  (config) => {
    const token = tokenStorage.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * Axios hatasından kullanıcıya gösterilecek anlamlı bir mesaj çıkarır.
 * Sunucu mesajlarını (NestJS validation array dahil) ve ağ hatalarını ele alır.
 */
export function extractErrorMessage(error: unknown): string {
  const ax = error as AxiosError<any>;
  if (!ax || !ax.isAxiosError) {
    return (error as Error)?.message ?? 'Beklenmeyen bir hata oluştu';
  }

  if (ax.code === 'ECONNABORTED') {
    return 'İstek zaman aşımına uğradı. İnternet bağlantınızı kontrol edin.';
  }

  if (!ax.response) {
    return 'Sunucuya ulaşılamıyor. Backend çalışıyor mu?';
  }

  const data = ax.response.data;
  const msg = data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  if (typeof msg === 'string') return msg;
  if (typeof data === 'string') return data;

  switch (ax.response.status) {
    case 400:
      return 'Geçersiz istek';
    case 401:
      return 'Oturum sona erdi, lütfen tekrar giriş yapın';
    case 403:
      return 'Bu işlem için yetkiniz yok';
    case 404:
      return 'Kayıt bulunamadı';
    case 409:
      return 'Çakışma: kayıt zaten mevcut olabilir';
    case 422:
      return 'Doğrulama hatası';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Sunucu hatası, lütfen daha sonra tekrar deneyin';
    default:
      return `Beklenmeyen hata (${ax.response.status})`;
  }
}

let redirectingToLogin = false;

// Response interceptor: 401'de logout, ağ ve sunucu hatalarında toast göster
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401) {
      if (!redirectingToLogin) {
        redirectingToLogin = true;
        toast.error('Oturum sona erdi, lütfen tekrar giriş yapın', {
          toastId: 'session-expired',
        });
        tokenStorage.remove();
        setTimeout(() => {
          window.location.href = '/login';
        }, 600);
      }
      return Promise.reject(error);
    }

    // Ağ hatası veya 5xx → otomatik bildirim göster.
    // 4xx hatalarını mutation'ların kendi onError handler'ları yönetir.
    const isNetworkError = !error.response;
    const isServerError = status !== undefined && status >= 500;

    if (isNetworkError || isServerError) {
      toast.error(extractErrorMessage(error), {
        toastId: isNetworkError ? 'network-error' : `server-error-${status}`,
      });
    }

    return Promise.reject(error);
  },
);

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res: AxiosResponse<AuthResponse> = await api.post('/auth/login', {
    email,
    password,
  });
  tokenStorage.set(res.data.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
  return res.data;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    tokenStorage.remove();
  }
}

export async function getCurrentUser(): Promise<User> {
  const res: AxiosResponse<User> = await api.get('/auth/me');
  return res.data;
}

// ─── Restoranlar ─────────────────────────────────────────────────────────────

export async function getRestaurants(
  page = 1,
  limit = 20,
): Promise<PaginatedResult<Restaurant>> {
  const res: AxiosResponse<PaginatedResult<Restaurant>> = await api.get(
    '/restaurants',
    { params: { page, limit } },
  );
  return res.data;
}

export async function getRestaurant(id: string): Promise<Restaurant> {
  const res: AxiosResponse<Restaurant> = await api.get(`/restaurants/${id}`);
  return res.data;
}

export async function createRestaurant(
  data: Partial<Restaurant>,
): Promise<Restaurant> {
  const res: AxiosResponse<Restaurant> = await api.post('/restaurants', data);
  return res.data;
}

export async function updateRestaurant(
  id: string,
  data: Partial<Restaurant>,
): Promise<Restaurant> {
  const res: AxiosResponse<Restaurant> = await api.patch(
    `/restaurants/${id}`,
    data,
  );
  return res.data;
}

export async function deleteRestaurant(id: string): Promise<{ message: string }> {
  const res: AxiosResponse<{ message: string }> = await api.delete(
    `/restaurants/${id}`,
  );
  return res.data;
}

// ─── Kuryeler ────────────────────────────────────────────────────────────────

interface CourierFilters {
  isOnline?: boolean;
}

export async function getCouriers(
  page = 1,
  limit = 20,
  filters?: CourierFilters,
): Promise<PaginatedResult<Courier>> {
  const res: AxiosResponse<PaginatedResult<Courier>> = await api.get(
    '/couriers',
    { params: { page, limit, ...filters } },
  );
  return res.data;
}

export async function getCourier(id: string): Promise<Courier> {
  const res: AxiosResponse<Courier> = await api.get(`/couriers/${id}`);
  return res.data;
}

export async function createCourier(data: Partial<Courier>): Promise<Courier> {
  const res: AxiosResponse<Courier> = await api.post('/couriers', data);
  return res.data;
}

export async function updateCourierLocation(
  id: string,
  latitude: number,
  longitude: number,
): Promise<Courier> {
  const res: AxiosResponse<Courier> = await api.patch(
    `/couriers/${id}/location`,
    { latitude, longitude },
  );
  return res.data;
}

export async function updateCourierStatus(
  id: string,
  isOnline: boolean,
): Promise<Courier> {
  const res: AxiosResponse<Courier> = await api.patch(
    `/couriers/${id}/status`,
    { isOnline },
  );
  return res.data;
}

export async function deleteCourier(id: string): Promise<{ message: string }> {
  const res: AxiosResponse<{ message: string }> = await api.delete(
    `/couriers/${id}`,
  );
  return res.data;
}

// ─── Siparişler ──────────────────────────────────────────────────────────────

interface OrderFilters {
  restaurantId?: string;
  courierId?: string;
}

export async function getOrders(
  page = 1,
  limit = 20,
  filters?: OrderFilters,
): Promise<PaginatedResult<Order>> {
  const res: AxiosResponse<PaginatedResult<Order>> = await api.get('/orders', {
    params: { page, limit, ...filters },
  });
  return res.data;
}

export async function getOrder(id: string): Promise<Order> {
  const res: AxiosResponse<Order> = await api.get(`/orders/${id}`);
  return res.data;
}

export async function createOrder(data: Partial<Order>): Promise<Order> {
  const res: AxiosResponse<Order> = await api.post('/orders', data);
  return res.data;
}

export async function assignOrder(
  orderId: string,
  courierId?: string,
): Promise<{ order: Order; assignedCourier: Courier; message: string }> {
  if (courierId) {
    // Manuel atama: durum güncelleme üzerinden
    const res = await api.patch(`/orders/${orderId}/status`, {
      status: 'assigned',
      courierId,
    });
    return { order: res.data, assignedCourier: res.data.courier, message: 'Kurye atandı' };
  }
  // Otomatik atama: algoritma ile
  const res = await api.post(`/orders/${orderId}/assign`);
  return res.data;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  courierId?: string,
): Promise<Order> {
  const res: AxiosResponse<Order> = await api.patch(
    `/orders/${orderId}/status`,
    { status, ...(courierId ? { courierId } : {}) },
  );
  return res.data;
}

export async function deleteOrder(id: string): Promise<{ message: string }> {
  const res: AxiosResponse<{ message: string }> = await api.delete(
    `/orders/${id}`,
  );
  return res.data;
}

// ─── Geriye Dönük Uyumluluk (mevcut component'lar için) ──────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const restaurantsApi = {
  getAll: (params?: { page?: number; limit?: number }) =>
    api.get('/restaurants', { params }),
  getOne: (id: string) => api.get(`/restaurants/${id}`),
  create: (data: object) => api.post('/restaurants', data),
  update: (id: string, data: object) => api.patch(`/restaurants/${id}`, data),
  delete: (id: string) => api.delete(`/restaurants/${id}`),
};

export const usersApi = {
  getAll: () => api.get<User[]>('/users'),
  getOne: (id: string) => api.get<User>(`/users/${id}`),
  create: (data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role?: string;
    isActive?: boolean;
  }) => api.post<User>('/users', data),
  update: (id: string, data: object) => api.patch<User>(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export const couriersApi = {
  getAll: (params?: { page?: number; limit?: number; isOnline?: boolean }) =>
    api.get('/couriers', { params }),
  getOne: (id: string) => api.get(`/couriers/${id}`),
  create: (data: object) => api.post('/couriers', data),
  createWithUser: (data: {
    email: string;
    fullName: string;
    password: string;
    phone?: string;
    vehicleType?: string;
    latitude?: number | null;
    longitude?: number | null;
  }) => api.post<Courier>('/couriers/with-user', data),
  update: (id: string, data: object) => api.patch(`/couriers/${id}`, data),
  updateStatus: (id: string, isOnline: boolean) =>
    api.patch(`/couriers/${id}/status`, { isOnline }),
  delete: (id: string) => api.delete(`/couriers/${id}`),
};

export const ordersApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    restaurantId?: string;
    courierId?: string;
  }) => api.get('/orders', { params }),
  getOne: (id: string) => api.get<Order>(`/orders/${id}`),
  create: (data: object) => api.post('/orders', data),
  updateStatus: (id: string, data: { status: string; courierId?: string }) =>
    api.patch(`/orders/${id}/status`, data),
  assign: (id: string) =>
    api.post<{
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
    }>(`/orders/${id}/assign`),
  delete: (id: string) => api.delete(`/orders/${id}`),
};

export default api;
