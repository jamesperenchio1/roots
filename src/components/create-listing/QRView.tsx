import { Link } from 'react-router-dom';
import { CheckCircle, QrCode } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { Listing } from '@/types';

interface QRViewProps {
  created: Listing | null;
  provenanceQR: string;
  speciesName: string;
}

export default function QRView({ created, provenanceQR, speciesName }: QRViewProps) {
  const { t } = useTranslation(['marketplace', 'common']);

  return (
    <div className="pt-24 pb-16 px-4">
      <div className="max-w-md mx-auto text-center">
        <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
        <h1 className="text-2xl font-light mb-2">{t('marketplace:create.successTitle')}</h1>
        <p className="text-zinc-500 mb-2">
          {t('marketplace:create.successSubtitle', { name: speciesName })}
        </p>
        <p className="text-sm text-zinc-600 mb-6">
          {t('marketplace:create.successDescription')}
        </p>

        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-6">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2 justify-center">
            <QrCode className="w-4 h-4 text-purple-400" />
            {t('marketplace:create.provenanceQrTitle')}
          </h3>
          <div className="w-48 h-48 bg-white rounded-xl mx-auto mb-3 p-3 flex items-center justify-center">
            {provenanceQR ? (
              <img
                src={provenanceQR}
                alt={t('marketplace:create.provenanceQrAlt')}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain"
              />
            ) : (
              <QrCode className="w-28 h-28 text-zinc-900" />
            )}
          </div>
          <p className="text-xs text-emerald-400 mb-2">{t('marketplace:create.autoDownloaded')}</p>
          <p className="text-xs text-zinc-500 mb-4">{t('marketplace:create.printInstructions')}</p>
          <div className="flex gap-2 justify-center">
            <a
              href={provenanceQR || '#'}
              download={`root-provenance-${created?.id || 'qr'}.png`}
              className="inline-flex items-center bg-emerald-500 hover:bg-emerald-600 text-black text-sm px-4 py-2 rounded-md font-medium"
            >
              {t('common:actions.download')}
            </a>
            <Button
              type="button"
              variant="outline"
              className="border-white/10 text-sm"
              onClick={() => window.print()}
            >
              {t('common:actions.print')}
            </Button>
          </div>
        </div>

        {/* Print-only QR tag template */}
        <div className="hidden print:block">
          <div className="text-center py-10">
            <h1 className="text-2xl font-bold mb-2">{t('marketplace:create.provenanceTagTitle')}</h1>
            <p className="text-sm mb-6">{speciesName}</p>
            <div className="w-64 h-64 bg-white rounded-xl mx-auto p-4 mb-4">
              <img
                src={provenanceQR}
                alt={t('marketplace:create.provenanceQrAlt')}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-xs text-zinc-500">{t('marketplace:create.scanInstruction')}</p>
            <p className="text-xs text-zinc-500 mt-1">
              {window.location.origin}/#/p/{created?.id}
            </p>
          </div>
        </div>

        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-4 text-left mb-6">
          <h4 className="text-sm font-medium mb-2">{t('marketplace:create.nextStepsTitle')}</h4>
          <ol className="text-sm text-zinc-500 space-y-1.5 list-decimal list-inside">
            <li>{t('marketplace:create.nextSteps.attach')}</li>
            <li>{t('marketplace:create.nextSteps.ship')}</li>
            <li>{t('marketplace:create.nextSteps.scan')}</li>
            <li>{t('marketplace:create.nextSteps.funds')}</li>
          </ol>
        </div>

        <div className="flex gap-3 justify-center">
          <Link
            to="/seller-dashboard"
            className="bg-white text-black px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors"
          >
            {t('marketplace:create.goToDashboard')}
          </Link>
          <Link
            to={created ? `/listing/${created.id}` : '/browse'}
            className="border border-white/20 px-6 py-2.5 rounded-lg text-sm hover:bg-white/5 transition-colors"
          >
            {t('marketplace:create.viewListing')}
          </Link>
        </div>
      </div>
    </div>
  );
}
