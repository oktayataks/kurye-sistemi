import { useQuery } from '@tanstack/react-query';
import { restaurantsApi } from '../services/api';
import { useAuth } from './useAuth';
import type { PaginatedResult, Restaurant } from '../types';

/**
 * Giriş yapan kullanıcının (restaurant rolündeki) kendi restoranını bulur.
 * Backend henüz /restaurants/me endpoint'ine sahip olmadığı için
 * tüm restoranları çekip userId üzerinden filtreliyoruz.
 */
export function useMyRestaurant() {
  const { user, isRestaurant } = useAuth();

  const query = useQuery({
    queryKey: ['my-restaurant', user?.id],
    enabled: !!user && isRestaurant,
    staleTime: 5 * 60_000, // 5 dakika cache
    queryFn: async () => {
      const res = await restaurantsApi.getAll({ page: 1, limit: 200 });
      const list = (res.data as PaginatedResult<Restaurant>).data;
      return list.find((r) => r.userId === user?.id) ?? null;
    },
  });

  return {
    restaurant: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
