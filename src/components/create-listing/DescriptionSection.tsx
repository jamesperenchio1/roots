'use client'

import { useTranslation } from 'react-i18next';

interface DescriptionSectionProps {
  description: string;
  setDescription: (value: string) => void;
  error?: string;
}

export default function DescriptionSection({
  description,
  setDescription,
  error,
}: DescriptionSectionProps) {
  const { t } = useTranslation(['marketplace', 'common']);

  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">
        {t('marketplace:create.descriptionLabel')}
      </label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={t('marketplace:create.descriptionPlaceholder')}
        rows={5}
        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 resize-none"
      />
      <div className="flex justify-between mt-1">
        {error && <p className="text-xs text-red-400">{error}</p>}
        <p className={`text-xs ml-auto ${description.length < 20 ? 'text-zinc-600' : 'text-emerald-400'}`}>
          {t('marketplace:create.chars', { count: description.length })}
        </p>
      </div>
    </div>
  );
}
