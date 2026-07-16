'use client'

import { Check, Circle, Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { EvidenceType } from '@/types';
import { evidenceTypeLabel } from '@/lib/identification';

interface IdentificationChecklistProps {
  steps: EvidenceType[];
  currentStepIndex: number;
  className?: string;
}

export function IdentificationChecklist({ steps, currentStepIndex, className = '' }: IdentificationChecklistProps) {
  const { t } = useTranslation('common');
  return (
    <div className={`bg-zinc-900/30 border border-white/5 rounded-xl p-5 ${className}`}>
      <h3 className="text-sm font-medium mb-4">{t('identification.evidenceChecklist')}</h3>
      <ol className="space-y-3">
        {steps.map((step, index) => {
          const done = index < currentStepIndex;
          const current = index === currentStepIndex;

          return (
            <li key={step} className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  done
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : current
                      ? 'bg-emerald-500 text-black'
                      : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : current ? <Camera className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
              </div>
              <span
                className={`text-sm ${
                  done ? 'text-zinc-400 line-through' : current ? 'text-white font-medium' : 'text-zinc-500'
                }`}
              >
                {evidenceTypeLabel(step)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
