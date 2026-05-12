export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: 'admin' | 'restaurant' | 'courier';
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: string;
  user: User;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  userId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export type VehicleType = 'bike' | 'motorbike' | 'car';

export interface Courier {
  id: string;
  userId: string;
  vehicleType: VehicleType;
  latitude: number;
  longitude: number;
  isOnline: boolean;
  currentOrders: number;
  rating: number;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export type OrderStatus = 'pending' | 'assigned' | 'picked_up' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  orderNumber: number;
  restaurantId: string;
  courierId: string | null;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  orderTotal: number;
  deliveryFee: number;
  status: OrderStatus;
  notes: string;
  assignedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  restaurant?: Restaurant;
  courier?: Courier;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  totalRestaurants: number;
  totalCouriers: number;
  onlineCouriers: number;
}
