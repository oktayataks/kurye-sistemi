import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import RestaurantLayout from './components/RestaurantLayout';

import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import RestaurantsPage from './pages/Restaurants';
import CouriersPage from './pages/Couriers';
import OrdersPage from './pages/Orders';
import LiveMapPage from './pages/LiveMap';
import LiveTrackingPage from './pages/LiveTracking';
import UsersPage from './pages/Users';
import {
  RestaurantDashboard,
  CreateOrder,
  MyOrders,
} from './pages/Restaurant';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

// ─── Default route by role ──────────────────────────────────────────────────

function getDefaultRouteForRole(role: string | undefined): string {
  switch (role) {
    case 'admin':
      return '/';
    case 'restaurant':
      return '/restaurant';
    default:
      return '/login';
  }
}

// ─── Route guards ───────────────────────────────────────────────────────────

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }
  return <>{children}</>;
}

function RestaurantRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isRestaurant, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isRestaurant) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }
  return <>{children}</>;
}

// ─── Catch-all redirect ─────────────────────────────────────────────────────

function CatchAllRedirect() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
}

// ─── App ────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          {/* Admin */}
          <Route
            path="/"
            element={
              <AdminRoute>
                <Layout />
              </AdminRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="restaurants" element={<RestaurantsPage />} />
            <Route path="couriers" element={<CouriersPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="live-map" element={<LiveMapPage />} />
            <Route path="live-tracking" element={<LiveTrackingPage />} />
            <Route path="users" element={<UsersPage />} />
          </Route>

          {/* Restaurant */}
          <Route
            path="/restaurant"
            element={
              <RestaurantRoute>
                <RestaurantLayout />
              </RestaurantRoute>
            }
          >
            <Route index element={<RestaurantDashboard />} />
            <Route path="create-order" element={<CreateOrder />} />
            <Route path="my-orders" element={<MyOrders />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<CatchAllRedirect />} />
        </Routes>
      </BrowserRouter>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        theme="light"
      />
    </QueryClientProvider>
  );
}
