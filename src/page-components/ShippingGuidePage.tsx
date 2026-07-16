'use client'

import { useState, useEffect, useCallback } from 'react';
import { Check, ChevronDown, Package, Leaf, Printer, RotateCcw, Truck, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'shipping-guide-progress';

interface Step {
  id: number;
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
  detailsKeys: string[];
  tipsKeys: string[];
}

const STEPS: Step[] = [
  {
    id: 1,
    icon: <Package className="w-5 h-5" />,
    titleKey: 'common:shippingGuide.steps.gatherMaterials.title',
    descriptionKey: 'common:shippingGuide.steps.gatherMaterials.description',
    detailsKeys: [
      'common:shippingGuide.steps.gatherMaterials.details.0',
      'common:shippingGuide.steps.gatherMaterials.details.1',
      'common:shippingGuide.steps.gatherMaterials.details.2',
      'common:shippingGuide.steps.gatherMaterials.details.3',
      'common:shippingGuide.steps.gatherMaterials.details.4',
      'common:shippingGuide.steps.gatherMaterials.details.5',
      'common:shippingGuide.steps.gatherMaterials.details.6',
      'common:shippingGuide.steps.gatherMaterials.details.7',
    ],
    tipsKeys: [
      'common:shippingGuide.steps.gatherMaterials.tips.0',
      'common:shippingGuide.steps.gatherMaterials.tips.1',
      'common:shippingGuide.steps.gatherMaterials.tips.2',
    ],
  },
  {
    id: 2,
    icon: <Leaf className="w-5 h-5" />,
    titleKey: 'common:shippingGuide.steps.preparePlant.title',
    descriptionKey: 'common:shippingGuide.steps.preparePlant.description',
    detailsKeys: [
      'common:shippingGuide.steps.preparePlant.details.0',
      'common:shippingGuide.steps.preparePlant.details.1',
      'common:shippingGuide.steps.preparePlant.details.2',
      'common:shippingGuide.steps.preparePlant.details.3',
      'common:shippingGuide.steps.preparePlant.details.4',
      'common:shippingGuide.steps.preparePlant.details.5',
      'common:shippingGuide.steps.preparePlant.details.6',
    ],
    tipsKeys: [
      'common:shippingGuide.steps.preparePlant.tips.0',
      'common:shippingGuide.steps.preparePlant.tips.1',
      'common:shippingGuide.steps.preparePlant.tips.2',
    ],
  },
  {
    id: 3,
    icon: <ShieldCheck className="w-5 h-5" />,
    titleKey: 'common:shippingGuide.steps.protectRoots.title',
    descriptionKey: 'common:shippingGuide.steps.protectRoots.description',
    detailsKeys: [
      'common:shippingGuide.steps.protectRoots.details.0',
      'common:shippingGuide.steps.protectRoots.details.1',
      'common:shippingGuide.steps.protectRoots.details.2',
      'common:shippingGuide.steps.protectRoots.details.3',
      'common:shippingGuide.steps.protectRoots.details.4',
      'common:shippingGuide.steps.protectRoots.details.5',
    ],
    tipsKeys: [
      'common:shippingGuide.steps.protectRoots.tips.0',
      'common:shippingGuide.steps.protectRoots.tips.1',
      'common:shippingGuide.steps.protectRoots.tips.2',
    ],
  },
  {
    id: 4,
    icon: <Truck className="w-5 h-5" />,
    titleKey: 'common:shippingGuide.steps.securePlant.title',
    descriptionKey: 'common:shippingGuide.steps.securePlant.description',
    detailsKeys: [
      'common:shippingGuide.steps.securePlant.details.0',
      'common:shippingGuide.steps.securePlant.details.1',
      'common:shippingGuide.steps.securePlant.details.2',
      'common:shippingGuide.steps.securePlant.details.3',
      'common:shippingGuide.steps.securePlant.details.4',
      'common:shippingGuide.steps.securePlant.details.5',
    ],
    tipsKeys: [
      'common:shippingGuide.steps.securePlant.tips.0',
      'common:shippingGuide.steps.securePlant.tips.1',
      'common:shippingGuide.steps.securePlant.tips.2',
    ],
  },
  {
    id: 5,
    icon: <Package className="w-5 h-5" />,
    titleKey: 'common:shippingGuide.steps.boxItUp.title',
    descriptionKey: 'common:shippingGuide.steps.boxItUp.description',
    detailsKeys: [
      'common:shippingGuide.steps.boxItUp.details.0',
      'common:shippingGuide.steps.boxItUp.details.1',
      'common:shippingGuide.steps.boxItUp.details.2',
      'common:shippingGuide.steps.boxItUp.details.3',
      'common:shippingGuide.steps.boxItUp.details.4',
      'common:shippingGuide.steps.boxItUp.details.5',
      'common:shippingGuide.steps.boxItUp.details.6',
    ],
    tipsKeys: [
      'common:shippingGuide.steps.boxItUp.tips.0',
      'common:shippingGuide.steps.boxItUp.tips.1',
      'common:shippingGuide.steps.boxItUp.tips.2',
    ],
  },
  {
    id: 6,
    icon: <ShieldCheck className="w-5 h-5" />,
    titleKey: 'common:shippingGuide.steps.labelSeal.title',
    descriptionKey: 'common:shippingGuide.steps.labelSeal.description',
    detailsKeys: [
      'common:shippingGuide.steps.labelSeal.details.0',
      'common:shippingGuide.steps.labelSeal.details.1',
      'common:shippingGuide.steps.labelSeal.details.2',
      'common:shippingGuide.steps.labelSeal.details.3',
      'common:shippingGuide.steps.labelSeal.details.4',
      'common:shippingGuide.steps.labelSeal.details.5',
    ],
    tipsKeys: [
      'common:shippingGuide.steps.labelSeal.tips.0',
      'common:shippingGuide.steps.labelSeal.tips.1',
      'common:shippingGuide.steps.labelSeal.tips.2',
    ],
  },
  {
    id: 7,
    icon: <Truck className="w-5 h-5" />,
    titleKey: 'common:shippingGuide.steps.chooseCourier.title',
    descriptionKey: 'common:shippingGuide.steps.chooseCourier.description',
    detailsKeys: [
      'common:shippingGuide.steps.chooseCourier.details.0',
      'common:shippingGuide.steps.chooseCourier.details.1',
      'common:shippingGuide.steps.chooseCourier.details.2',
      'common:shippingGuide.steps.chooseCourier.details.3',
      'common:shippingGuide.steps.chooseCourier.details.4',
      'common:shippingGuide.steps.chooseCourier.details.5',
      'common:shippingGuide.steps.chooseCourier.details.6',
      'common:shippingGuide.steps.chooseCourier.details.7',
    ],
    tipsKeys: [
      'common:shippingGuide.steps.chooseCourier.tips.0',
      'common:shippingGuide.steps.chooseCourier.tips.1',
      'common:shippingGuide.steps.chooseCourier.tips.2',
    ],
  },
];

const CHECKLIST_KEYS = [
  'common:shippingGuide.checklist.items.0',
  'common:shippingGuide.checklist.items.1',
  'common:shippingGuide.checklist.items.2',
  'common:shippingGuide.checklist.items.3',
  'common:shippingGuide.checklist.items.4',
  'common:shippingGuide.checklist.items.5',
  'common:shippingGuide.checklist.items.6',
  'common:shippingGuide.checklist.items.7',
  'common:shippingGuide.checklist.items.8',
  'common:shippingGuide.checklist.items.9',
  'common:shippingGuide.checklist.items.10',
  'common:shippingGuide.checklist.items.11',
  'common:shippingGuide.checklist.items.12',
  'common:shippingGuide.checklist.items.13',
  'common:shippingGuide.checklist.items.14',
  'common:shippingGuide.checklist.items.15',
  'common:shippingGuide.checklist.items.16',
  'common:shippingGuide.checklist.items.17',
  'common:shippingGuide.checklist.items.18',
  'common:shippingGuide.checklist.items.19',
  'common:shippingGuide.checklist.items.20',
  'common:shippingGuide.checklist.items.21',
  'common:shippingGuide.checklist.items.22',
  'common:shippingGuide.checklist.items.23',
  'common:shippingGuide.checklist.items.24',
  'common:shippingGuide.checklist.items.25',
  'common:shippingGuide.checklist.items.26',
];

export default function ShippingGuidePage() {
  const { t } = useTranslation(['common']);
  const [expanded, setExpanded] = useState<number | null>(1);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [showReset, setShowReset] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCompleted(new Set(JSON.parse(saved)));
    } catch { /* ignore */ }
  }, []);

  const save = useCallback((next: Set<number>) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  }, []);

  const toggleComplete = (id: number) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      save(next);
      return next;
    });
  };

  const toggleExpand = (id: number) => {
    setExpanded(prev => (prev === id ? null : id));
  };

  const reset = () => {
    setCompleted(new Set());
    save(new Set());
    setShowReset(false);
  };

  const progress = Math.round((completed.size / STEPS.length) * 100);

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight mb-3">{t('common:shippingGuide.title')}</h1>
          <p className="text-zinc-500 max-w-lg mx-auto">
            {t('common:shippingGuide.subtitle')}
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-500">{t('common:shippingGuide.progress.label')}</span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-emerald-400">{progress}%</span>
              {completed.size > 0 && (
                <button
                  onClick={() => setShowReset(true)}
                  className="text-xs text-zinc-600 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> {t('common:shippingGuide.progress.reset')}
                </button>
              )}
            </div>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Reset Confirm */}
        {showReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
            <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-sm p-6">
              <h3 className="text-lg font-medium mb-2">{t('common:shippingGuide.reset.title')}</h3>
              <p className="text-sm text-zinc-400 mb-6">{t('common:shippingGuide.reset.description')}</p>
              <div className="flex gap-3">
                <button onClick={() => setShowReset(false)} className="flex-1 py-2.5 rounded-lg text-sm border border-white/10 hover:bg-white/5">{t('common:shippingGuide.reset.cancel')}</button>
                <button onClick={reset} className="flex-1 py-2.5 rounded-lg text-sm bg-red-500 text-white font-medium hover:bg-red-600">{t('common:shippingGuide.reset.confirm')}</button>
              </div>
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-3">
          {STEPS.map(step => {
            const isOpen = expanded === step.id;
            const isDone = completed.has(step.id);
            return (
              <div
                key={step.id}
                className={cn(
                  'border rounded-xl overflow-hidden transition-colors',
                  isDone ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/5 bg-zinc-900/30'
                )}
              >
                <button
                  onClick={() => toggleExpand(step.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-medium',
                    isDone ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400'
                  )}>
                    {isDone ? <Check className="w-4 h-4" /> : step.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-medium', isDone && 'text-emerald-400')}>{t(step.titleKey)}</p>
                    <p className="text-xs text-zinc-500 truncate">{t(step.descriptionKey).slice(0, 60)}…</p>
                  </div>
                  <ChevronDown className={cn('w-5 h-5 text-zinc-600 transition-transform', isOpen && 'rotate-180')} />
                </button>

                <div className={cn(
                  'grid transition-all duration-300',
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                )}>
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4 pt-1 space-y-4">
                      <p className="text-sm text-zinc-400 leading-relaxed">{t(step.descriptionKey)}</p>

                      <div className="space-y-1.5">
                        {step.detailsKeys.map((d, i) => (
                          <p key={i} className="text-sm text-zinc-300 pl-3 border-l-2 border-zinc-700">{t(d)}</p>
                        ))}
                      </div>

                      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                        <p className="text-xs font-medium text-emerald-400 mb-1">{t('common:shippingGuide.proTips')}</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {step.tipsKeys.map((tip, i) => (
                            <li key={i} className="text-xs text-zinc-400">{t(tip)}</li>
                          ))}
                        </ul>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <div className={cn(
                          'w-5 h-5 rounded border flex items-center justify-center transition-colors',
                          isDone ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'
                        )}>
                          {isDone && <Check className="w-3 h-3 text-black" />}
                        </div>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isDone}
                          onChange={() => toggleComplete(step.id)}
                        />
                        <span className="text-sm text-zinc-400">{t('common:shippingGuide.stepCompleted')}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Checklist */}
        <div className="mt-12 bg-white text-black rounded-xl p-6 sm:p-8 print:block">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Printer className="w-5 h-5" />
              {t('common:shippingGuide.checklist.title')}
            </h2>
            <button
              onClick={() => window.print()}
              className="text-sm bg-black text-white px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors print:hidden"
            >
              {t('common:shippingGuide.checklist.print')}
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
            {CHECKLIST_KEYS.map((item, i) => (
              <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                <div className="w-4 h-4 border border-zinc-400 rounded shrink-0" />
                <span>{t(item)}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-6 print:hidden">{t('common:shippingGuide.checklist.tip')}</p>
        </div>
      </div>
    </div>
  );
}
