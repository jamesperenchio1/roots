import { useQuery } from '@tanstack/react-query';
import { fetchProvenance } from '@/lib/api';

export interface ProvenanceSummary {
  total_owners: number;
  total_sales_value: number;
}

export function useProvenanceSummary(plantId: string | undefined) {
  return useQuery<ProvenanceSummary | null>({
    queryKey: ['public', 'provenance', plantId ?? ''],
    queryFn: async () => {
      if (!plantId) return null;
      const { transfers } = await fetchProvenance(plantId);
      if (transfers.length === 0) return null;
      return {
        total_owners: new Set(transfers.map((t) => t.to_user_id)).size,
        total_sales_value: transfers.reduce((sum, t) => sum + (t.sale_price_thb || 0), 0),
      };
    },
    enabled: !!plantId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}
