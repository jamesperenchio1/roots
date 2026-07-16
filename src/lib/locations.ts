import { supabase } from './supabase/client';
import type { UserLocation } from '@/types';
import { logger } from './logger';

export interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

function nominatimHeaders() {
  return {
    Accept: 'application/json',
    'User-Agent': 'Roots Marketplace (roots@example.com)',
  };
}

export async function searchNominatim(query: string): Promise<NominatimResult[]> {
  if (!query.trim()) return [];
  try {
    const url = `${NOMINATIM_URL}/search?format=json&q=${encodeURIComponent(query.trim())}&limit=5`;
    const res = await fetch(url, { headers: nominatimHeaders() });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    return (await res.json()) as NominatimResult[];
  } catch (e) {
    logger.warn('searchNominatim failed', { error: e instanceof Error ? e.message : String(e) });
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `${NOMINATIM_URL}/reverse?format=json&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { headers: nominatimHeaders() });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    const data = await res.json();
    return data?.display_name || null;
  } catch (e) {
    logger.warn('reverseGeocode failed', { error: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371e3;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

type DbRow = Record<string, unknown>;

function mapUserLocation(r: DbRow): UserLocation {
  return {
    id: r.id as string,
    profile_id: r.profile_id as string,
    name: (r.name as string) || 'Untitled',
    address_line: (r.address_line as string) || undefined,
    province: (r.province as string) || undefined,
    lat: (r.lat as number) || undefined,
    lng: (r.lng as number) || undefined,
    is_default: !!r.is_default,
    verified_at: (r.verified_at as string) || undefined,
    verification_method: (r.verification_method as string) || undefined,
    created_at: r.created_at as string,
    updated_at: (r.updated_at as string) || (r.created_at as string),
  };
}

export async function getUserLocations(profileId: string): Promise<UserLocation[]> {
  const { data, error } = await supabase
    .from('user_locations')
    .select('*')
    .eq('profile_id', profileId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapUserLocation);
}

export interface NewUserLocationInput {
  profile_id: string;
  name: string;
  address_line?: string;
  province?: string;
  lat?: number;
  lng?: number;
  is_default?: boolean;
}

export async function createUserLocation(input: NewUserLocationInput): Promise<UserLocation> {
  // Only one default per profile.
  if (input.is_default) {
    await supabase.from('user_locations').update({ is_default: false }).eq('profile_id', input.profile_id);
  }
  const { data, error } = await supabase
    .from('user_locations')
    .insert({
      profile_id: input.profile_id,
      name: input.name,
      address_line: input.address_line || null,
      province: input.province || null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      is_default: input.is_default ?? false,
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapUserLocation(data);
}

export async function updateUserLocation(id: string, input: Partial<NewUserLocationInput>): Promise<UserLocation> {
  if (input.is_default && input.profile_id) {
    await supabase.from('user_locations').update({ is_default: false }).eq('profile_id', input.profile_id);
  }
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.address_line !== undefined) patch.address_line = input.address_line || null;
  if (input.province !== undefined) patch.province = input.province || null;
  if (input.lat !== undefined) patch.lat = input.lat ?? null;
  if (input.lng !== undefined) patch.lng = input.lng ?? null;
  if (input.is_default !== undefined) patch.is_default = input.is_default;
  patch.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from('user_locations').update(patch).eq('id', id).select('*').single();
  if (error) throw error;
  return mapUserLocation(data);
}

export async function deleteUserLocation(id: string): Promise<void> {
  const { error } = await supabase.from('user_locations').delete().eq('id', id);
  if (error) throw error;
}

export async function setDefaultUserLocation(profileId: string, locationId: string): Promise<void> {
  await supabase.from('user_locations').update({ is_default: false }).eq('profile_id', profileId);
  await supabase.from('user_locations').update({ is_default: true, updated_at: new Date().toISOString() }).eq('id', locationId);
}

export async function verifyUserLocationWithGps(
  locationId: string,
  deviceCoords: { lat: number; lng: number }
): Promise<UserLocation> {
  const { data: existing, error: fetchError } = await supabase
    .from('user_locations')
    .select('*')
    .eq('id', locationId)
    .single();
  if (fetchError) throw fetchError;
  const loc = mapUserLocation(existing);
  if (!loc.lat || !loc.lng) throw new Error('Location has no pin to verify against');
  const distance = haversineMeters({ lat: loc.lat, lng: loc.lng }, deviceCoords);
  if (distance > 500) {
    throw new Error(`Device is ${Math.round(distance)} m from the pinned location. Must be within 500 m to verify.`);
  }
  const { data, error } = await supabase
    .from('user_locations')
    .update({
      verified_at: new Date().toISOString(),
      verification_method: 'device_gps',
      updated_at: new Date().toISOString(),
    })
    .eq('id', locationId)
    .select('*')
    .single();
  if (error) throw error;
  return mapUserLocation(data);
}

export async function confirmUserLocationOnMap(locationId: string): Promise<UserLocation> {
  const { data, error } = await supabase
    .from('user_locations')
    .update({
      verified_at: new Date().toISOString(),
      verification_method: 'map_confirm',
      updated_at: new Date().toISOString(),
    })
    .eq('id', locationId)
    .select('*')
    .single();
  if (error) throw error;
  return mapUserLocation(data);
}
