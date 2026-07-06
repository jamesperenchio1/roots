interface TypingIndicatorProps {
  names: string[];
}

export default function TypingIndicator({ names }: TypingIndicatorProps) {
  if (names.length === 0) return null;

  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing`
        : `${names[0]} and ${names.length - 1} others are typing`;

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
