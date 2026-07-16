import { supabase } from '@/lib/supabase';
import type {
  IdentificationRequest,
  UploadedMedia,
  IdentificationResult,
  ProviderResult,
  MarketEstimate,
  EvidenceType,
} from '@/types';
import type { IdentificationEvidence, CombinedResult, EvidenceNeed } from './types';
import { mergeProviderResults, decideNextEvidence } from './evidence';
import { getDefaultProviders } from './registry';
import { buildMarketEstimate } from './marketEstimate';
import { getSpeciesById } from '@/data/mockData';
import { fetchPublicData } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { publicKeys } from '@/lib/queryKeys';

export async function createIdentificationRequest(input: {
  userId?: string;
  country?: string;
  growingConditions?: string;
  notes?: string;
}): Promise<IdentificationRequest> {
  const { data, error } = await supabase
    .from('plant_identification_requests')
    .insert({
      user_id: input.userId || null,
      country: input.country || null,
      growing_conditions: input.growingConditions || null,
      notes: input.notes || null,
      requested_evidence_steps: [] as EvidenceType[],
      current_step: 0,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapRequest(data as DbRow);
}

export async function getIdentificationRequest(id: string): Promise<IdentificationRequest | null> {
  const { data, error } = await supabase.from('plant_identification_requests').select('*').eq('id', id).single();
  if (error || !data) return null;
  return mapRequest(data as DbRow);
}

export async function updateIdentificationRequest(
  id: string,
  input: {
    country?: string;
    growingConditions?: string;
    notes?: string;
  }
): Promise<IdentificationRequest> {
  const updates: Record<string, unknown> = {};
  if (input.country !== undefined) updates.country = input.country || null;
  if (input.growingConditions !== undefined) updates.growing_conditions = input.growingConditions || null;
  if (input.notes !== undefined) updates.notes = input.notes || null;
  const { data, error } = await supabase
    .from('plant_identification_requests')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapRequest(data as DbRow);
}

export async function updateRequestStatus(
  id: string,
  status: IdentificationRequest['status'],
  need?: EvidenceNeed | null
): Promise<void> {
  const updates: Record<string, unknown> = { status };
  if (status === 'completed') updates.completed_at = new Date().toISOString();
  if (need) {
    updates.requested_evidence_steps = [need.type];
  }
  const { error } = await supabase.from('plant_identification_requests').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function saveUploadedMedia(media: UploadedMedia): Promise<UploadedMedia> {
  const { data, error } = await supabase
    .from('identification_uploaded_media')
    .insert({
      id: media.id,
      request_id: media.request_id,
      file_name: media.file_name,
      storage_bucket: media.storage_bucket,
      storage_path: media.storage_path,
      mime_type: media.mime_type,
      media_type: media.media_type,
      thumbnail_path: media.thumbnail_path || null,
      preview_path: media.preview_path || null,
      evidence_type: media.evidence_type || null,
      metadata: media.metadata || {},
      sort_order: media.sort_order || 0,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return withUrls(mapUploadedMedia(data as DbRow));
}

export async function getRequestMedia(requestId: string): Promise<UploadedMedia[]> {
  const { data, error } = await supabase
    .from('identification_uploaded_media')
    .select('*')
    .eq('request_id', requestId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((r) => withUrls(mapUploadedMedia(r as DbRow)));
}

export async function runIdentification(
  requestId: string,
  evidence: IdentificationEvidence[]
): Promise<{ result: CombinedResult; needsMore: EvidenceNeed | null }> {
  const start = performance.now();
  const providers = getDefaultProviders();
  const results = await Promise.all(
    providers.map(async (p) => {
      try {
        return await p.identify(evidence);
      } catch (err) {
        return {
          provider: p.name,
          provider_version: p.version,
          confidence: 0,
          scientific_name: 'Unknown',
          common_names: [],
          detected_characteristics: [],
          reasoning: err instanceof Error ? err.message : `${p.name} failed`,
        } as ProviderResult;
      }
    })
  );
  const combined = mergeProviderResults(results);
  combined.processing_time_ms = Math.round(performance.now() - start);

  await addProcessingHistoryEntry({
    requestId,
    stage: 'ensemble',
    provider: 'ensemble',
    inputSummary: `${evidence.length} evidence items`,
    outputSummary: `${combined.scientific_name} @ ${(combined.confidence * 100).toFixed(0)}%`,
    confidence: combined.confidence,
    durationMs: combined.processing_time_ms,
  });

  const needsMore = decideNextEvidence(combined, evidence);
  return { result: combined, needsMore };
}

export async function saveIdentificationResult(
  requestId: string,
  combined: CombinedResult
): Promise<IdentificationResult> {
  const species = getSpeciesById(combined.scientific_name);
  const detectedSpeciesId = species?.id;

  const { data: resultRow, error } = await supabase
    .from('identification_results')
    .insert({
      request_id: requestId,
      provider: 'ensemble',
      detected_species_id: detectedSpeciesId || null,
      scientific_name: combined.scientific_name,
      common_names: combined.common_names,
      confidence: combined.confidence,
      reasoning: combined.reasoning,
      detected_characteristics: combined.detected_characteristics,
      native_region: combined.native_region || null,
      growth_habit: combined.growth_habit || null,
      mature_size: combined.mature_size || null,
      difficulty: combined.difficulty || null,
      care_summary: combined.care_summary || null,
      variegation: combined.variegation || null,
      known_aliases: combined.known_aliases,
      potential_rarity: combined.potential_rarity || null,
      processing_time_ms: combined.processing_time_ms || null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  if (combined.provider_results.length > 0) {
    await supabase.from('identification_provider_results').insert(
      combined.provider_results.map((pr) => mapProviderResultForInsert((resultRow as DbRow).id as string, pr))
    );
  }

  const marketData = await queryClient.fetchQuery({
    queryKey: publicKeys.all(),
    queryFn: fetchPublicData,
    staleTime: 5 * 60 * 1000,
  });
  const estimate = buildMarketEstimate(combined, marketData);
  const { data: estimateRow } = await supabase
    .from('market_estimates')
    .insert({
      result_id: (resultRow as DbRow).id as string,
      species_id: estimate.species_id || null,
      avg_asking_price: estimate.avg_asking_price ?? null,
      median_price: estimate.median_price ?? null,
      lowest_active: estimate.lowest_active ?? null,
      highest_active: estimate.highest_active ?? null,
      recent_sales_count: estimate.recent_sales_count,
      trend_percent: estimate.trend_percent ?? null,
      suggested_range_low: estimate.suggested_range_low ?? null,
      suggested_range_high: estimate.suggested_range_high ?? null,
      confidence: estimate.confidence,
      data_sufficient: estimate.data_sufficient,
    })
    .select()
    .single();

  const { data: providerRows } = await supabase
    .from('identification_provider_results')
    .select('*')
    .eq('result_id', (resultRow as DbRow).id as string);

  return mapIdentificationResult(resultRow as DbRow, (estimateRow as DbRow | null) ?? null, providerRows as DbRow[] | null);
}

export async function getLatestResult(requestId: string): Promise<IdentificationResult | null> {
  const { data: resultRow, error } = await supabase
    .from('identification_results')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error || !resultRow) return null;

  const { data: providerRows } = await supabase
    .from('identification_provider_results')
    .select('*')
    .eq('result_id', (resultRow as DbRow).id as string);

  const { data: estimateRow } = await supabase
    .from('market_estimates')
    .select('*')
    .eq('result_id', (resultRow as DbRow).id as string)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return mapIdentificationResult(resultRow as DbRow, (estimateRow as DbRow | null) ?? null, providerRows as DbRow[] | null);
}

export async function addProcessingHistoryEntry(entry: {
  requestId: string;
  stage: string;
  provider?: string;
  inputSummary?: string;
  outputSummary?: string;
  confidence?: number;
  durationMs?: number;
}): Promise<void> {
  await supabase.from('processing_history').insert({
    request_id: entry.requestId,
    stage: entry.stage,
    provider: entry.provider || null,
    input_summary: entry.inputSummary || null,
    output_summary: entry.outputSummary || null,
    confidence: entry.confidence ?? null,
    duration_ms: entry.durationMs ?? null,
  });
}

// ---------- helpers & mappers ----------

type DbRow = Record<string, unknown>;

function withUrls(media: UploadedMedia): UploadedMedia {
  if (!media.storage_bucket || !media.storage_path) return media;
  const publicUrl = supabase.storage.from(media.storage_bucket).getPublicUrl(media.storage_path).data.publicUrl;
  const thumbnailUrl = media.thumbnail_path
    ? supabase.storage.from(media.storage_bucket).getPublicUrl(media.thumbnail_path).data.publicUrl
    : publicUrl;
  return { ...media, url: publicUrl, thumbnail_url: thumbnailUrl };
}

function mapRequest(r: DbRow): IdentificationRequest {
  return {
    id: r.id as string,
    user_id: (r.user_id as string | undefined) ?? undefined,
    status: r.status as IdentificationRequest['status'],
    requested_evidence_steps: ((r.requested_evidence_steps as string[] | undefined) || []) as EvidenceType[],
    current_step: (r.current_step as number | undefined) ?? 0,
    country: (r.country as string | undefined) ?? undefined,
    growing_conditions: (r.growing_conditions as string | undefined) ?? undefined,
    notes: (r.notes as string | undefined) ?? undefined,
    confidence_threshold: (r.confidence_threshold as number | undefined) ?? 0.75,
    created_at: r.created_at as string,
    updated_at: (r.updated_at as string | undefined) ?? (r.created_at as string),
    completed_at: (r.completed_at as string | undefined) ?? undefined,
  };
}

function mapUploadedMedia(r: DbRow): UploadedMedia {
  return {
    id: r.id as string,
    request_id: r.request_id as string,
    file_name: r.file_name as string,
    storage_bucket: r.storage_bucket as string,
    storage_path: r.storage_path as string,
    mime_type: r.mime_type as string,
    media_type: r.media_type as UploadedMedia['media_type'],
    thumbnail_path: (r.thumbnail_path as string | undefined) ?? undefined,
    preview_path: (r.preview_path as string | undefined) ?? undefined,
    evidence_type: (r.evidence_type as UploadedMedia['evidence_type']) ?? undefined,
    metadata: (r.metadata as Record<string, unknown> | undefined) ?? {},
    sort_order: (r.sort_order as number | undefined) ?? 0,
    created_at: r.created_at as string,
  };
}

function mapProviderResultForInsert(resultId: string, pr: ProviderResult): Record<string, unknown> {
  return {
    result_id: resultId,
    provider: pr.provider,
    provider_version: pr.provider_version || null,
    confidence: pr.confidence,
    scientific_name: pr.scientific_name,
    common_names: pr.common_names,
    detected_characteristics: pr.detected_characteristics,
    reasoning: pr.reasoning,
    raw_response: pr.raw_response || {},
    processing_time_ms: pr.processing_time_ms ?? null,
  };
}

function mapProviderResult(r: DbRow): ProviderResult {
  return {
    provider: r.provider as string,
    provider_version: (r.provider_version as string | undefined) ?? undefined,
    confidence: (r.confidence as number) ?? 0,
    scientific_name: (r.scientific_name as string) ?? 'Unknown',
    common_names: (r.common_names as string[] | undefined) || [],
    detected_characteristics: (r.detected_characteristics as string[] | undefined) || [],
    reasoning: (r.reasoning as string | undefined) ?? '',
    raw_response: (r.raw_response as Record<string, unknown> | undefined) ?? undefined,
    processing_time_ms: (r.processing_time_ms as number | undefined) ?? undefined,
  };
}

function mapMarketEstimate(r: DbRow | null): MarketEstimate | undefined {
  if (!r) return undefined;
  return {
    id: r.id as string,
    result_id: r.result_id as string,
    species_id: (r.species_id as string | undefined) ?? undefined,
    avg_asking_price: (r.avg_asking_price as number | undefined) ?? undefined,
    median_price: (r.median_price as number | undefined) ?? undefined,
    lowest_active: (r.lowest_active as number | undefined) ?? undefined,
    highest_active: (r.highest_active as number | undefined) ?? undefined,
    recent_sales_count: (r.recent_sales_count as number | undefined) ?? 0,
    trend_percent: (r.trend_percent as number | undefined) ?? undefined,
    suggested_range_low: (r.suggested_range_low as number | undefined) ?? undefined,
    suggested_range_high: (r.suggested_range_high as number | undefined) ?? undefined,
    confidence: (r.confidence as MarketEstimate['confidence'] | undefined) || 'low',
    data_sufficient: !!r.data_sufficient,
    created_at: r.created_at as string,
  };
}

function mapIdentificationResult(
  r: DbRow,
  estimateRow: DbRow | null,
  providerRows: DbRow[] | null
): IdentificationResult {
  return {
    id: r.id as string,
    request_id: r.request_id as string,
    provider: (r.provider as string) ?? 'ensemble',
    provider_version: (r.provider_version as string | undefined) ?? undefined,
    detected_species_id: (r.detected_species_id as string | undefined) ?? undefined,
    scientific_name: (r.scientific_name as string) ?? 'Unknown plant',
    common_names: (r.common_names as string[] | undefined) || [],
    confidence: (r.confidence as number) ?? 0,
    reasoning: (r.reasoning as string | undefined) ?? '',
    detected_characteristics: (r.detected_characteristics as string[] | undefined) || [],
    native_region: (r.native_region as string | undefined) ?? undefined,
    growth_habit: (r.growth_habit as string | undefined) ?? undefined,
    mature_size: (r.mature_size as string | undefined) ?? undefined,
    difficulty: (r.difficulty as string | undefined) ?? undefined,
    care_summary: (r.care_summary as string | undefined) ?? undefined,
    variegation: (r.variegation as string | undefined) ?? undefined,
    known_aliases: (r.known_aliases as string[] | undefined) || [],
    potential_rarity: (r.potential_rarity as string | undefined) ?? undefined,
    processing_time_ms: (r.processing_time_ms as number | undefined) ?? undefined,
    created_at: r.created_at as string,
    provider_results: (providerRows || []).map(mapProviderResult),
    market_estimate: mapMarketEstimate(estimateRow),
  };
}
