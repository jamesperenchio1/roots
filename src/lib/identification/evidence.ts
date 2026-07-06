import type { IdentificationEvidence, CombinedResult, EvidenceNeed } from './types';
import type { ProviderResult, EvidenceType } from '@/types';
import { ALL_SPECIES } from '@/data/speciesDatabase';
import { normalizeConfidence } from './provider';

const CRITICAL_EVIDENCE: EvidenceType[] = ['overall', 'leaf', 'stem'];

function speciesMatches(name: string): { scientific_name: string; common_names: string[]; aliases: string[] } | null {
  const norm = name.toLowerCase().trim();
  for (const s of ALL_SPECIES) {
    const sci = s.scientific_name.toLowerCase();
    if (sci === norm || sci.includes(norm)) {
      return {
        scientific_name: s.scientific_name,
        common_names: [s.common_name_en, s.common_name_th].filter(Boolean),
        aliases: s.synonyms,
      };
    }
    if (s.common_name_en.toLowerCase() === norm || s.common_name_th.toLowerCase() === norm) {
      return {
        scientific_name: s.scientific_name,
        common_names: [s.common_name_en, s.common_name_th].filter(Boolean),
        aliases: s.synonyms,
      };
    }
    for (const syn of s.synonyms) {
      if (syn.toLowerCase() === norm) {
        return {
          scientific_name: s.scientific_name,
          common_names: [s.common_name_en, s.common_name_th].filter(Boolean),
          aliases: s.synonyms,
        };
      }
    }
  }
  return null;
}

export function mergeProviderResults(results: ProviderResult[]): CombinedResult {
  if (results.length === 0) {
    return {
      scientific_name: 'Unknown plant',
      common_names: [],
      confidence: 0,
      reasoning: 'No provider results available.',
      detected_characteristics: [],
      provider_results: [],
      known_aliases: [],
    };
  }

  if (results.length === 1) {
    const r = results[0];
    const matched = speciesMatches(r.scientific_name);
    return {
      scientific_name: matched?.scientific_name || r.scientific_name,
      common_names: matched?.common_names || r.common_names,
      confidence: normalizeConfidence(r.confidence),
      reasoning: r.reasoning,
      detected_characteristics: r.detected_characteristics,
      provider_results: results,
      known_aliases: matched?.aliases || [],
    };
  }

  // Weighted average by confidence; penalise disagreement.
  const nameVotes = new Map<string, number>();
  let totalConfidence = 0;
  const allCharacteristics = new Set<string>();
  const reasons: string[] = [];

  for (const r of results) {
    const key = r.scientific_name.toLowerCase();
    nameVotes.set(key, (nameVotes.get(key) || 0) + r.confidence);
    totalConfidence += r.confidence;
    r.detected_characteristics.forEach((c) => allCharacteristics.add(c));
    reasons.push(`${r.provider}: ${r.scientific_name} (${(r.confidence * 100).toFixed(0)}%)`);
  }

  const sortedNames = Array.from(nameVotes.entries()).sort((a, b) => b[1] - a[1]);
  const topName = sortedNames[0][0];
  const agreement = sortedNames[0][1] / totalConfidence;
  const avgConfidence = totalConfidence / results.length;
  const combinedConfidence = normalizeConfidence(avgConfidence * (0.6 + 0.4 * agreement));

  const matched = speciesMatches(topName);
  return {
    scientific_name: matched?.scientific_name || topName,
    common_names: matched?.common_names || results.find(r => r.scientific_name.toLowerCase() === topName)?.common_names || [],
    confidence: combinedConfidence,
    reasoning: `Combined ${results.length} providers. ${reasons.join('; ')}. Agreement: ${(agreement * 100).toFixed(0)}%.`,
    detected_characteristics: Array.from(allCharacteristics),
    provider_results: results,
    known_aliases: matched?.aliases || [],
  };
}

export function decideNextEvidence(combined: CombinedResult, evidence: IdentificationEvidence[]): EvidenceNeed | null {
  const present = new Set(evidence.map((e) => e.type));
  const hasCritical = CRITICAL_EVIDENCE.every((t) => present.has(t));

  if (combined.confidence >= 0.85 && hasCritical) return null;

  if (!present.has('overall')) {
    return { type: 'overall', reason: 'An overall plant photo helps establish growth habit and size.' };
  }
  if (!present.has('leaf')) {
    return { type: 'leaf', reason: 'A clear leaf close-up is one of the most reliable identification features.' };
  }
  if (!present.has('stem')) {
    return { type: 'stem', reason: 'Stem texture and colour help distinguish similar species.' };
  }
  if (!present.has('node') && combined.confidence < 0.8) {
    return { type: 'node', reason: 'A growth-node close-up would help confirm the exact species.' };
  }
  if (!present.has('flower') && combined.confidence < 0.75) {
    return { type: 'flower', reason: 'Flowers provide definitive identification for many plants.' };
  }
  if (!present.has('variegation') && combined.detected_characteristics.some(c => c.toLowerCase().includes('variegat'))) {
    return { type: 'variegation', reason: 'A dedicated variegation close-up helps assess pattern stability.' };
  }
  if (combined.confidence < 0.65) {
    return { type: 'alternate_angle', reason: 'Another angle would add more confidence to the identification.' };
  }
  return null;
}

export function evidenceTypeLabel(type: EvidenceType): string {
  const labels: Record<EvidenceType, string> = {
    overall: 'Overall plant',
    alternate_angle: 'Alternate angle',
    leaf: 'Leaf close-up',
    leaf_underside: 'Leaf underside',
    stem: 'Stem',
    node: 'Growth node',
    petiole: 'Petiole',
    roots: 'Roots',
    flower: 'Flower',
    fruit: 'Fruit',
    variegation: 'Variegation',
    pot: 'Pot / container',
    height: 'Plant height',
    habitat: 'Growing conditions',
  };
  return labels[type] || type;
}
