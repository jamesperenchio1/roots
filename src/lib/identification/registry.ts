import type { IdentificationProvider } from './provider';
import { MockProvider } from './providers/mockProvider';
import { PlantNetProvider } from './providers/plantNetProvider';
import { EnsembleProvider } from './providers/ensembleProvider';

export function getDefaultProviders(): IdentificationProvider[] {
  const providers: IdentificationProvider[] = [new MockProvider()];

  const plantNetKey = typeof import.meta.env !== 'undefined'
    ? (import.meta.env.VITE_PLANTNET_API_KEY as string | undefined)
    : undefined;

  if (plantNetKey) {
    providers.unshift(new PlantNetProvider(plantNetKey));
  }

  return providers;
}

export function getDefaultEnsemble(): IdentificationProvider {
  return new EnsembleProvider(getDefaultProviders());
}

export { MockProvider, PlantNetProvider, EnsembleProvider };
