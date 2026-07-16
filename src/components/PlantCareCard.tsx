'use client'

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Droplets, Sun, Sprout } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  searchPerenualPlants,
  getPerenualPlantDetails,
  getCareGuide,
  wateringToIcon,
  sunlightToEmoji,
  type PerenualPlant,
  type PerenualCareGuide,
} from '@/lib/perenual';
import { searchSpecies } from '@/data/speciesDatabase';
import type { SpeciesEntry } from '@/data/speciesDatabase';

interface PlantCareCardProps {
  speciesName: string;
  compact?: boolean;
}

interface CareData {
  perenual: PerenualPlant | null;
  guide: PerenualCareGuide | null;
  fallback: SpeciesEntry | null;
}

export default function PlantCareCard({ speciesName, compact }: PlantCareCardProps) {
  const { t } = useTranslation(['marketplace', 'common']);
  const [care, setCare] = useState<CareData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const searchResults = await searchPerenualPlants(speciesName);
        if (cancelled) return;

        if (searchResults.length > 0) {
          const first = searchResults[0];
          const [details, guide] = await Promise.all([
            getPerenualPlantDetails(first.id),
            getCareGuide(first.id),
          ]);
          if (!cancelled) {
            setCare({ perenual: details ?? first, guide, fallback: null });
          }
        } else {
          // Fallback to local database
          const fallbackResults = searchSpecies(speciesName, 1);
          if (!cancelled) {
            setCare({ perenual: null, guide: null, fallback: fallbackResults[0] ?? null });
          }
        }
      } catch {
        if (!cancelled) {
          const fallbackResults = searchSpecies(speciesName, 1);
          setCare({ perenual: null, guide: null, fallback: fallbackResults[0] ?? null });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [speciesName]);

  if (loading) {
    if (compact) {
      return (
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      );
    }
    return (
      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </div>
    );
  }

  const plant = care?.perenual;
  const guide = care?.guide;
  const fb = care?.fallback;

  if (!plant && !fb) {
    return (
      <div className={`bg-zinc-900/30 border border-white/5 rounded-xl ${compact ? 'px-3 py-2' : 'p-6'}`}>
        <p className="text-xs text-zinc-500">{t('plantCare.noInfo')}</p>
      </div>
    );
  }

  const careLevel = plant?.care_level ?? (fb ? capitalize(fb.care_level) : t('plantCare.fallback.moderate'));
  const watering = plant?.watering ?? (fb ? fb.water_requirement : t('plantCare.fallback.averageWater'));
  const sunlight = plant?.sunlight ?? (fb ? [fb.light_requirement] : [t('plantCare.fallback.brightIndirect')]);
  const description = plant?.description ?? fb?.description ?? '';

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span title={t('plantCare.careLevelTitle', { level: careLevel })} className="inline-flex items-center gap-1 bg-zinc-800/50 px-2.5 py-1 rounded-full text-xs text-zinc-300 cursor-help">
          <Sprout className="w-3 h-3 text-emerald-400" />
          {careLevel}
        </span>
        <span title={t('plantCare.wateringTitle', { level: wateringToIcon(watering) })} className="inline-flex items-center gap-1 bg-zinc-800/50 px-2.5 py-1 rounded-full text-xs text-zinc-300 cursor-help">
          <Droplets className="w-3 h-3 text-sky-400" />
          {wateringToIcon(watering)}
        </span>
        <span title={t('plantCare.lightTitle', { level: sunlight.join(', ') })} className="inline-flex items-center gap-1 bg-zinc-800/50 px-2.5 py-1 rounded-full text-xs text-zinc-300 cursor-help">
          <Sun className="w-3 h-3 text-amber-400" />
          {sunlightToEmoji(sunlight)}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6">
      <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
        <Sprout className="w-5 h-5 text-emerald-400" />
        {t('plantCare.title')}
      </h3>

      {description && (
        <p className="text-sm text-zinc-400 leading-relaxed mb-4">{description}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="inline-flex items-center gap-1.5 bg-zinc-800/50 px-3 py-1.5 rounded-full text-xs text-zinc-300">
          <Sprout className="w-3.5 h-3.5 text-emerald-400" />
          {t('plantCare.careLevel', { level: careLevel })}
        </span>
        <span className="inline-flex items-center gap-1.5 bg-zinc-800/50 px-3 py-1.5 rounded-full text-xs text-zinc-300">
          <Droplets className="w-3.5 h-3.5 text-sky-400" />
          {t('plantCare.water', { level: wateringToIcon(watering) })}
        </span>
        <span className="inline-flex items-center gap-1.5 bg-zinc-800/50 px-3 py-1.5 rounded-full text-xs text-zinc-300">
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          {t('plantCare.light', { level: sunlightToEmoji(sunlight), detail: sunlight.join(', ') })}
        </span>
      </div>

      {guide && guide.section.length > 0 && (
        <div className="space-y-3 mt-4">
          {guide.section.map((sec) => (
            <div key={sec.id} className="bg-zinc-900/50 rounded-lg p-3">
              <h4 className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-1">
                {sec.type}
              </h4>
              <p className="text-sm text-zinc-400 leading-relaxed">{sec.description}</p>
            </div>
          ))}
        </div>
      )}

      {!plant && fb && (
        <p className="text-xs text-zinc-500 mt-3">
          {t('plantCare.fallbackNote')}
        </p>
      )}
    </div>
  );
}

function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
