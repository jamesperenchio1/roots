import type { IdentificationProvider } from '../provider';
import type { IdentificationEvidence } from '../types';
import type { ProviderResult } from '@/types';
import { ALL_SPECIES } from '@/data/speciesDatabase';

function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  const x = Math.sin(h) * 10000;
  return x - Math.floor(x);
}

function pickSpecies(seed: string): typeof ALL_SPECIES[0] {
  const idx = Math.floor(seededRandom(seed) * ALL_SPECIES.length);
  return ALL_SPECIES[idx];
}

export class MockProvider implements IdentificationProvider {
  readonly name = 'mock';
  readonly version = '1.0.0';

  supports(): boolean {
    return true;
  }

  async identify(evidence: IdentificationEvidence[]): Promise<ProviderResult> {
    const start = performance.now();
    await new Promise((resolve) => setTimeout(resolve, 400));

    const seed = evidence.map((e) => e.media.storage_path).join('|');
    const species = pickSpecies(seed);

    const presentTypes = new Set(evidence.map((e) => e.type));
    const baseConfidence = 0.45 + seededRandom(seed + 'confidence') * 0.35;
    const criticalBonus = (['overall', 'leaf', 'stem'].every((t) => presentTypes.has(t as typeof evidence[0]['type'])) ? 0.15 : 0);
    const flowerBonus = presentTypes.has('flower') ? 0.1 : 0;
    const confidence = Math.min(0.95, baseConfidence + criticalBonus + flowerBonus);

    const characteristics: string[] = [];
    if (presentTypes.has('leaf')) characteristics.push('distinctive leaf venation');
    if (presentTypes.has('stem')) characteristics.push('smooth herbaceous stem');
    if (presentTypes.has('flower')) characteristics.push('visible inflorescence');
    if (presentTypes.has('variegation')) characteristics.push('variegated foliage');
    if (characteristics.length === 0) characteristics.push('general habit matches');

    const processing_time_ms = Math.round(performance.now() - start);

    return {
      provider: this.name,
      provider_version: this.version,
      confidence,
      scientific_name: species.scientific_name,
      common_names: [species.common_name_en, species.common_name_th].filter(Boolean),
      detected_characteristics: characteristics,
      reasoning: `Mock analysis matched ${species.scientific_name} based on ${evidence.length} evidence items (${Array.from(presentTypes).join(', ')}).`,
      processing_time_ms,
    };
  }
}
