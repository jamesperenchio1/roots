import type { IdentificationProvider } from '../provider';
import type { IdentificationEvidence } from '../types';
import type { ProviderResult } from '@/types';

export class EnsembleProvider implements IdentificationProvider {
  readonly name = 'ensemble';
  readonly version = '1.0.0';
  private providers: IdentificationProvider[];

  constructor(providers: IdentificationProvider[]) {
    this.providers = providers.filter((p) => p);
  }

  supports(): boolean {
    return this.providers.some((p) => p.supports('image', 'image/jpeg'));
  }

  async identify(evidence: IdentificationEvidence[]): Promise<ProviderResult> {
    if (this.providers.length === 0) {
      return {
        provider: this.name,
        provider_version: this.version,
        confidence: 0,
        scientific_name: 'Unknown',
        common_names: [],
        detected_characteristics: [],
        reasoning: 'No providers configured in ensemble.',
      };
    }

    const results = await Promise.all(
      this.providers.map(async (p) => {
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

    // Return a synthetic provider result that represents the ensemble consensus.
    const valid = results.filter((r) => r.confidence > 0);
    if (valid.length === 0) {
      return {
        provider: this.name,
        provider_version: this.version,
        confidence: 0,
        scientific_name: 'Unknown',
        common_names: [],
        detected_characteristics: [],
        reasoning: 'All providers failed.',
      };
    }

    const best = valid.sort((a, b) => b.confidence - a.confidence)[0];
    return {
      provider: this.name,
      provider_version: this.version,
      confidence: best.confidence,
      scientific_name: best.scientific_name,
      common_names: best.common_names,
      detected_characteristics: best.detected_characteristics,
      reasoning: `Ensemble selected ${best.scientific_name} from ${valid.length} provider(s).`,
      raw_response: { provider_results: results },
    };
  }
}
