import { useQuery } from '@tanstack/react-query';
import { userKeys } from '@/lib/queryKeys';
import {
  fetchUserTransactions,
  fetchUserNotifications,
  fetchUserOffers,
  fetchUserWatchlist,
  fetchUserPriceAlerts,
  fetchUserDisputes,
  fetchListingsByIds,
  getNotifications,
  getOffersForBuyer,
  getOffersForSeller,
  getUserPriceAlerts,
  getProfileFromCache,
} from '@/lib/api';
import {
  getTransactionsWithDetails,
  WATCHLIST,
  getSpeciesById,
  getListingById,
  getUserById,
} from '@/data/mockData';
import type { Transaction, Notification, Offer, WatchlistItem, PriceAlert, Dispute } from '@/types';

const defaultOptions = {
  staleTime: 2 * 60 * 1000,
  gcTime: 5 * 60 * 1000,
  retry: 1,
} as const;

// The in-memory mock arrays are empty in production, so fall back to the real
// profile cache hydrated by fetchPublicData/fetchProfile.
function resolveProfile(id: string | undefined) {
  if (!id) return undefined;
  return getUserById(id) ?? getProfileFromCache(id);
}

function enrichOffer(o: Offer): Offer {
  return {
    ...o,
    listing: getListingById(o.listing_id),
    buyer: resolveProfile(o.buyer_id),
    seller: resolveProfile(o.seller_id),
  };
}

export function useUserTransactions(userId: string | undefined) {
  const keyUserId = userId ?? '';
  return useQuery<Transaction[]>({
    queryKey: userKeys.transactions(keyUserId),
    queryFn: fetchUserTransactions,
    enabled: !!userId,
    initialData: () =>
      userId
        ? getTransactionsWithDetails().filter((t) => t.buyer_id === userId || t.seller_id === userId)
        : [],
    ...defaultOptions,
  });
}

export function useNotifications(userId: string | undefined) {
  const keyUserId = userId ?? '';
  return useQuery<Notification[]>({
    queryKey: userKeys.notifications(keyUserId),
    queryFn: () => fetchUserNotifications(userId!),
    enabled: !!userId,
    initialData: () => (userId ? getNotifications(userId) : []),
    ...defaultOptions,
  });
}

export function useOffers(userId: string | undefined) {
  const keyUserId = userId ?? '';
  return useQuery<Offer[]>({
    queryKey: userKeys.offers(keyUserId),
    queryFn: async () => {
      const offers = await fetchUserOffers();
      // Resolve the listings from Supabase; the mock LISTINGS array is empty in
      // production, so getListingById alone left every offer without a listing.
      const listingIds = Array.from(new Set(offers.map((o) => o.listing_id).filter(Boolean)));
      const listings = await fetchListingsByIds(listingIds);
      const listingMap = new Map(listings.map((l) => [l.id, l]));
      return offers.map((o) => ({
        ...enrichOffer(o),
        listing: listingMap.get(o.listing_id) ?? getListingById(o.listing_id),
      }));
    },
    enabled: !!userId,
    initialData: () => {
      if (!userId) return [];
      const map = new Map<string, Offer>();
      getOffersForBuyer(userId).forEach((o) => map.set(o.id, enrichOffer(o)));
      getOffersForSeller(userId).forEach((o) => map.set(o.id, enrichOffer(o)));
      return Array.from(map.values());
    },
    ...defaultOptions,
  });
}

export function useWatchlist(userId: string | undefined) {
  const keyUserId = userId ?? '';
  return useQuery<WatchlistItem[]>({
    queryKey: userKeys.watchlist(keyUserId),
    queryFn: () => fetchUserWatchlist(userId!),
    enabled: !!userId,
    initialData: () => (userId ? WATCHLIST.filter((w) => w.user_id === userId) : []),
    ...defaultOptions,
  });
}

export function usePriceAlerts(userId: string | undefined) {
  const keyUserId = userId ?? '';
  return useQuery<PriceAlert[]>({
    queryKey: userKeys.priceAlerts(keyUserId),
    queryFn: async () => {
      const alerts = await fetchUserPriceAlerts();
      return alerts.map((a) => ({ ...a, species: getSpeciesById(a.species_id) }));
    },
    enabled: !!userId,
    initialData: () => (userId ? getUserPriceAlerts(userId) : []),
    ...defaultOptions,
  });
}

export function useDisputes(userId: string | undefined) {
  const keyUserId = userId ?? '';
  return useQuery<Dispute[]>({
    queryKey: userKeys.disputes(keyUserId),
    queryFn: fetchUserDisputes,
    enabled: !!userId,
    ...defaultOptions,
  });
}
