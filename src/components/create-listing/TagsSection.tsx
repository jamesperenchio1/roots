import { useTranslation } from 'react-i18next';
import type { Dispatch, SetStateAction } from 'react';

const TAG_VOCAB = [
  'variegated', 'rare', 'mature', 'seedling', 'cutting', 'rooted', 'unrooted',
  'flowering', 'fragrant', 'pet-friendly', 'beginner-friendly', 'low-light',
  'air-purifying', 'fast-growing', 'drought-tolerant', 'humidity-loving',
  'trailing', 'climbing', 'compact', 'large', 'indoor', 'outdoor', 'aroid',
  'hoya', 'succulent', 'cactus', 'fern', 'orchid', 'herb', 'vegetable',
  'fruit', 'bonsai', 'carnivorous', 'aquatic', 'variegata', 'albo', 'mint',
  'collector', 'imported', 'local', 'cold-hardy', 'shade', 'full-sun',
];

const QUICK_TAGS = [
  'variegated', 'rare', 'mature', 'seedling', 'cutting', 'rooted',
  'flowering', 'fragrant', 'pet-friendly', 'beginner-friendly',
];

interface TagsSectionProps {
  tags: string[];
  setTags: Dispatch<SetStateAction<string[]>>;
  tagInput: string;
  setTagInput: (value: string) => void;
}

export default function TagsSection({ tags, setTags, tagInput, setTagInput }: TagsSectionProps) {
  const { t } = useTranslation(['marketplace', 'common']);

  const suggestions = (() => {
    const q = tagInput.trim().toLowerCase();
    if (!q) return [];
    return TAG_VOCAB.filter((tTag) => tTag.includes(q) && !tags.includes(tTag)).slice(0, 6);
  })();

  const addTag = (value: string) => {
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (normalized && !tags.includes(normalized) && tags.length < 10) {
      setTags((prev) => [...prev, normalized]);
      setTagInput('');
    }
  };

  const toggleQuickTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]
    );
  };

  return (
    <div>
      <label className="text-sm font-medium mb-2 block">{t('marketplace:create.tagsLabel')}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {QUICK_TAGS.map((tTag) => (
          <button
            key={tTag}
            type="button"
            onClick={() => toggleQuickTag(tTag)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              tags.includes(tTag)
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                : 'border-white/10 text-zinc-500 hover:border-white/20 hover:text-zinc-300'
            }`}
          >
            {t(`marketplace:create.tagSuggestions.${tTag}`)}
          </button>
        ))}
      </div>
      <div className="relative">
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag(tagInput);
            }
          }}
          placeholder={t('marketplace:create.tagInputPlaceholder')}
          className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
        />
        {tagInput.trim() && suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-zinc-900 border border-white/10 rounded-lg overflow-hidden shadow-xl">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  if (!tags.includes(s) && tags.length < 10) setTags([...tags, s]);
                  setTagInput('');
                }}
                className="block w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {tags.map((tTag) => (
            <span
              key={tTag}
              className="inline-flex items-center gap-1 text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full"
            >
              {t(`marketplace:create.tagSuggestions.${tTag}`)}
              <button
                type="button"
                onClick={() => setTags((prev) => prev.filter((x) => x !== tTag))}
                className="text-zinc-500 hover:text-white"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
