import { useQuery } from '@tanstack/react-query';
import { transactionKeys } from '@/lib/queryKeys';
import { fetchTransactionById } from '@/lib/api';
import { getTransactionById } from '@/data/mockData';
import type { Transaction } from '@/types';

export function useTransaction(id: string | undefined) {
  return useQuery<Transaction | null>({
    queryKey: transactionKeys.detail(id),
    queryFn: () => (id ? fetchTransactionById(id) : null),
    initialData: () => (id ? getTransactionById(id) ?? null : null),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}
