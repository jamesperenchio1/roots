'use client'


import Link from 'next/link';
import { QrCode } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';

// A Wikipedia-style "what is this?" affordance: hover for a mini summary, click
// through to the full white paper at /provenance. Used anywhere we mention the
// QR provenance tag so the explanation lives in exactly one place.
export default function ProvenanceInfo({ label }: { label?: string }) {
  const { t } = useTranslation('common');
  const linkLabel = label || t('provenance.whatIsThis');

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <Link href="/provenance" className="text-emerald-400 hover:underline text-xs cursor-help">
          {linkLabel}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 bg-zinc-900 border-white/10 text-zinc-300">
        <div className="flex gap-3">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <QrCode className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white mb-1">{t('common:provenance.title')}</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {t('common:provenance.description')}
            </p>
            <Link href="/provenance" className="inline-block mt-2 text-xs text-emerald-400 hover:underline">
              {t('common:provenance.readMore')}
            </Link>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
