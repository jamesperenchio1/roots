import type { EvidenceType, UploadedMedia } from '@/types';

export interface IdentificationEvidence {
  type: EvidenceType;
  media: UploadedMedia;
  description?: string;
}

export interface CombinedResult {
  scientific_name: string;
  common_names: string[];
  confidence: number;
  reasoning: string;
  detected_characteristics: string[];
  provider_results: import('@/types').ProviderResult[];
  native_region?: string;
  growth_habit?: string;
  mature_size?: string;
  difficulty?: string;
  care_summary?: string;
  variegation?: string;
  known_aliases: string[];
  potential_rarity?: string;
  processing_time_ms?: number;
}

export interface EvidenceNeed {
  type: EvidenceType;
  reason: string;
}
