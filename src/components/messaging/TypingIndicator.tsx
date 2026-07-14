import { useTranslation } from 'react-i18next';

interface TypingIndicatorProps {
  names: string[];
}

export default function TypingIndicator({ names }: TypingIndicatorProps) {
  const { t } = useTranslation(['messages']);
  if (names.length === 0) return null;

  const label =
    names.length === 1
      ? t('messages:typing.single', { name: names[0] })
      : names.length === 2
        ? t('messages:typing.two', { name1: names[0], name2: names[1] })
        : t('messages:typing.multiple', { name: names[0], count: names.length - 1 });

  return (
    <div className="flex items-center gap-1.5 text-xs text-zinc-500 px-1 py-1" aria-live="polite">
      <span className="sr-only">{label}</span>
      <span aria-hidden="true">{label}</span>
      <span className="flex gap-0.5" aria-hidden="true">
        <span className="w-1 h-1 rounded-full bg-zinc-500 animate-bounce [animation-delay:0ms]" />
        <span className="w-1 h-1 rounded-full bg-zinc-500 animate-bounce [animation-delay:150ms]" />
        <span className="w-1 h-1 rounded-full bg-zinc-500 animate-bounce [animation-delay:300ms]" />
      </span>
    </div>
  );
}
