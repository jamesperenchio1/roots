import { useState, useRef, useEffect } from 'react';
import { Plus, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const DEFAULT_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '😡', '👏', '🔥'];

interface ReactionPickerProps {
  onSelect: (reaction: string) => void;
  existingReactions?: string[];
  align?: 'start' | 'center' | 'end';
}

export default function ReactionPicker({ onSelect, existingReactions, align = 'center' }: ReactionPickerProps) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSelect = (reaction: string) => {
    onSelect(reaction);
    setOpen(false);
    setCustom('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-zinc-500 hover:text-white hover:bg-white/10"
          aria-label="Add reaction"
        >
          {existingReactions && existingReactions.length > 0 ? (
            <Plus className="h-3.5 w-3.5" />
          ) : (
            <Smile className="h-3.5 w-3.5" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-2 bg-zinc-900 border-white/10">
        <div className="grid grid-cols-4 gap-1">
          {DEFAULT_REACTIONS.map((r) => (
            <button
              key={r}
              onClick={() => handleSelect(r)}
              className="text-xl p-1.5 rounded hover:bg-white/10 transition-colors"
              aria-label={`React with ${r}`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-white/10">
          <input
            ref={inputRef}
            value={custom}
            onChange={(e) => {
              const value = e.target.value;
              setCustom(value);
              // Pick the first emoji character if user pastes one.
              const match = value.match(/\p{Emoji}/u);
              if (match && value.length > 0) {
                handleSelect(match[0]);
              }
            }}
            placeholder="Emoji…"
            className="w-24 bg-zinc-800 border border-white/10 rounded px-2 py-1 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
