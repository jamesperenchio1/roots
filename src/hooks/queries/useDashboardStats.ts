import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '@/lib/queryKeys';
import { fetchDashboardStats } from '@/lib/api';
import type { DashboardStats } from '@/types';

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: adminKeys.dashboardStats(),
    queryFn: fetchDashboardStats,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}
