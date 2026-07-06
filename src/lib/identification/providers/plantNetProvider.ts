import type { IdentificationProvider } from '../provider';
import type { IdentificationEvidence } from '../types';
import type { ProviderResult } from '@/types';

const PLANTNET_API_BASE = 'https://my-api.plantnet.org/v2/identify/all';

export class PlantNetProvider implements IdentificationProvider {
  readonly name = 'plantnet';
  readonly version = 'v2';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  supports(mediaType: string, mimeType: string): boolean {
    return mediaType === 'image' && mimeType.startsWith('image/');
  }

  async identify(evidence: IdentificationEvidence[]): Promise<ProviderResult> {
    const start = performance.now();
    const imageEvidence = evidence.filter((e) => e.media.media_type === 'image');
    if (imageEvidence.length === 0) {
      return {
        provider: this.name,
        provider_version: this.version,
        confidence: 0,
        scientific_name: 'Unknown',
        common_names: [],
        detected_characteristics: [],
        reasoning: 'PlantNet requires at least one image.',
        processing_time_ms: Math.round(performance.now() - start),
      };
    }

    try {
      const params = new URLSearchParams({ 'api-key': this.apiKey });
      const body = new FormData();
      for (const e of imageEvidence.slice(0, 5)) {
        const response = await fetch(e.media.url || e.media.storage_path);
        const blob = await response.blob();
        body.append('images', blob, e.media.file_name);
        body.append('organs', e.type === 'leaf' ? 'leaf' : e.type === 'flower' ? 'flower' : e.type === 'fruit' ? 'fruit' : 'auto');
      }

      const res = await fetch(`${PLANTNET_API_BASE}?${params.toString()}`, {
        method: 'POST',
        body,
      });

      if (!res.ok) {
        throw new Error(`PlantNet returned ${res.status}`);
      }

      const data = await res.json();
      const best = data.results?.[0];
      if (!best) {
        throw new Error('PlantNet returned no results');
      }

      const scientific = best.species?.scientificNameWithoutAuthor || 'Unknown';
      const common = Array.isArray(best.species?.commonNames) ? best.species.commonNames.slice(0, 5) : [];

      return {
        provider: this.name,
        provider_version: this.version,
        confidence: Math.min(0.99, best.score || 0),
        scientific_name: scientific,
        common_names: common,
        detected_characteristics: [],
        reasoning: `PlantNet matched ${scientific} with score ${(best.score * 100).toFixed(1)}%.`,
        raw_response: data as Record<string, unknown>,
        processing_time_ms: Math.round(performance.now() - start),
      };
    } catch (err) {
      return {
        provider: this.name,
        provider_version: this.version,
        confidence: 0,
        scientific_name: 'Unknown',
        common_names: [],
        detected_characteristics: [],
        reasoning: err instanceof Error ? err.message : 'PlantNet request failed',
        processing_time_ms: Math.round(performance.now() - start),
      };
    }
  }
}
