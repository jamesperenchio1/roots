import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { THAI_PROVINCES } from '@/lib/provinces';

interface ProvinceComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ProvinceCombobox({ value, onChange, placeholder }: ProvinceComboboxProps) {
  const { t } = useTranslation(['auth']);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);

  useEffect(() => {
    if (!open) setQuery(value);
  }, [open, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          data-testid="province-combobox"
          className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-sm text-left flex items-center justify-between focus:outline-none focus:border-emerald-500/50 hover:border-white/20 transition-colors"
        >
          <span className={value ? 'text-white' : 'text-zinc-600'}>{value || placeholder}</span>
          <ChevronsUpDown className="w-4 h-4 text-zinc-500 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-zinc-900 border border-white/10"
        align="start"
      >
        <Command>
          <CommandInput
            placeholder={placeholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>{t('auth:signup.noProvince')}</CommandEmpty>
            <CommandGroup>
              {THAI_PROVINCES.map((province) => (
                <CommandItem
                  key={province}
                  value={province}
                  onSelect={(currentValue) => {
                    onChange(currentValue);
                    setQuery(currentValue);
                    setOpen(false);
                  }}
                >
                  <span>{province}</span>
                  {value === province && (
                    <Check className="ml-auto w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
