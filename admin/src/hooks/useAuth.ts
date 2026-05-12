import { useState } from 'react';
import type { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? (JSON.parse(stored) as User) : null;
  });

  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('token'),
  );

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === 'admin';
  const isRestaurant = user?.role === 'restaurant';
  const isCourier = user?.role === 'courier';

  const login = (accessToken: string, userData: User) => {
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return {
    user,
    token,
    isAuthenticated,
    isAdmin,
    isRestaurant,
    isCourier,
    login,
    logout,
  };
}
