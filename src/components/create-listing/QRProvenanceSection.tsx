import { useTranslation } from 'react-i18next';

interface QRProvenanceSectionProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function QRProvenanceSection({ checked, onChange }: QRProvenanceSectionProps) {
  const { t } = useTranslation(['marketplace', 'common']);

  return (
    <div className="bg-zinc-900/30 border border-white/5 rounded-lg p-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-10 h-6 bg-zinc-700 peer-checked:bg-emerald-500 rounded-full relative shrink-0 transition-colors">
          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-zinc-200">{t('marketplace:provenance.generateQrTag')}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{t('marketplace:provenance.generateQrTagHelp')}</p>
          <p className="text-xs text-zinc-600 mt-1">{t('marketplace:provenance.generateQrTagSellerNote')}</p>
        </div>
      </label>
    </div>
  );
}
