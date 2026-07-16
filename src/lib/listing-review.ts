import { uploadListingPhoto, mapListing } from './api';
import { supabase } from './supabase/client';
import { verifyQrFromFile, type QrVerifyResult } from './qr-verify';
import { USERS } from '@/data/mockData';
import type { Listing, Profile } from '@/types';

export async function submitListingQrVerification(
  listing: Listing,
  photoFile: File,
  sellerId: string
): Promise<QrVerifyResult & { photoUrl?: string }> {
  const expectedPlantId = listing.plant_id;
  const verifyResult = await verifyQrFromFile(photoFile, expectedPlantId);
  if (!verifyResult.ok) return verifyResult;

  const photoUrl = await uploadListingPhoto(photoFile, sellerId);
  const { error } = await supabase
    .from('listings')
    .update({
      qr_verification_photo_url: photoUrl,
      qr_verified_at: new Date().toISOString(),
      qr_verified_by: sellerId,
    })
    .eq('id', listing.id);
  if (error) throw error;
  return { ...verifyResult, photoUrl };
}

export async function adminReviewListing(
  listingId: string,
  decision: 'active' | 'rejected',
  reason: string,
  notes: string,
  adminId: string
): Promise<void> {
  const { error } = await supabase
    .from('listings')
    .update({
      status: decision,
      review_status: decision === 'active' ? 'approved' : 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
      review_reason: reason,
      review_notes: notes,
    })
    .eq('id', listingId);
  if (error) throw error;
}

export async function fetchPendingListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const profiles: Record<string, Profile> = Object.fromEntries(USERS.map((u) => [u.id, u]));
  return Promise.all((data || []).map(async (r: Record<string, unknown>) => mapListing(r, profiles)));
}
