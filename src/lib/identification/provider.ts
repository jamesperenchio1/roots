import type { IdentificationEvidence, CombinedResult, EvidenceNeed } from './types';
import type { ProviderResult } from '@/types';

export interface IdentificationProvider {
  readonly name: string;
  readonly version: string;
  supports(mediaType: string, mimeType: string): boolean;
  identify(evidence: IdentificationEvidence[]): Promise<ProviderResult>;
}

export interface IdentificationStrategy {
  readonly name: string;
  combine(providerResults: ProviderResult[], evidence: IdentificationEvidence[]): CombinedResult;
  requestMoreEvidence(combined: CombinedResult, evidence: IdentificationEvidence[]): EvidenceNeed | null;
}

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.75;

export function normalizeConfidence(value: number): number {
  return Math.max(0, Math.min(1, value));
}
