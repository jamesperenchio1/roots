'use client'

import { useState, useEffect, useMemo } from 'react';
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
import { getProvinceOptions, type ProvinceOption } from '@/lib/provinces';

interface ProvinceComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  options?: ProvinceOption[];
}

export function ProvinceCombobox({ value, onChange, placeholder, options }: ProvinceComboboxProps) {
  const { t, i18n } = useTranslation(['auth']);
  const [open, setOpen] = useState(false);

  const opts = useMemo(
    () => options ?? getProvinceOptions(i18n.language),
    [options, i18n.language]
  );

  const selected = opts.find((o) => o.value === value);
  const [query, setQuery] = useState(selected?.label ?? '');

  useEffect(() => {
    if (!open) setQuery(selected?.label ?? '');
  }, [open, selected]);

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
          <span className={value ? 'text-white' : 'text-zinc-600'}>
            {selected?.label || placeholder}
          </span>
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
              {opts.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  keywords={[option.value]}
                  onSelect={() => {
                    onChange(option.value);
                    setQuery(option.label);
                    setOpen(false);
                  }}
                >
                  <span>{option.label}</span>
                  {value === option.value && (
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
