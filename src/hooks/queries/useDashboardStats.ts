import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '@/lib/queryKeys';
import { getDashboardStats } from '@/data/mockData';
import type { DashboardStats } from '@/types';

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: adminKeys.dashboardStats(),
    queryFn: getDashboardStats,
    initialData: getDashboardStats,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}
