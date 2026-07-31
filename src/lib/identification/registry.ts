import type { IdentificationProvider } from './provider';
import { PlantNetProvider } from './providers/plantNetProvider';
import { EnsembleProvider } from './providers/ensembleProvider';

export function getDefaultProviders(): IdentificationProvider[] {
  const providers: IdentificationProvider[] = [];

  const plantNetKey = process.env.NEXT_PUBLIC_PLANTNET_API_KEY as string | undefined;

  if (plantNetKey) {
    providers.push(new PlantNetProvider(plantNetKey));
  }

  return providers;
}

export function getDefaultEnsemble(): IdentificationProvider {
  return new EnsembleProvider(getDefaultProviders());
}

export { PlantNetProvider, EnsembleProvider };
