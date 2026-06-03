import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Check, Leaf } from 'lucide-react';
import { searchSpecies, normalizeSpeciesName, type SpeciesEntry } from '@/data/speciesDatabase';

interface SpeciesAutocompleteProps {
  value: string;
  onChange: (value: string, species?: SpeciesEntry) => void;
  placeholder?: string;
  label?: string;
}

export default function SpeciesAutocomplete({ value, onChange, placeholder = 'Search plants...', label }: SpeciesAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SpeciesEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isNewSpecies, setIsNewSpecies] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = useCallback((val: string) => {
    setQuery(val);
    setIsOpen(true);
    setSelectedIndex(-1);

    if (val.length >= 2) {
      const matches = searchSpecies(val, 8);
      setResults(matches);
      // Check if this is a new/unlisted species
      const norm = normalizeSpeciesName(val);
      const exactMatch = matches.some(m =>
        normalizeSpeciesName(m.scientific_name) === norm ||
        normalizeSpeciesName(m.common_name_en) === norm ||
        normalizeSpeciesName(m.common_name_th) === norm
      );
      setIsNewSpecies(!exactMatch && val.length > 3);
    } else {
      setResults([]);
      setIsNewSpecies(false);
    }

    onChange(val);
  }, [onChange]);

  const handleSelect = (species: SpeciesEntry) => {
    setQuery(`${species.scientific_name} (${species.common_name_en})`);
    setIsOpen(false);
    setIsNewSpecies(false);
    onChange(species.scientific_name, species);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const highlightMatch = (text: string, queryTerms: string[]) => {
    // Escape HTML to prevent XSS, then highlight matches with React-safe segments
    const escapeHtml = (str: string) =>
      str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const escaped = escapeHtml(text);
    const terms = queryTerms.filter(t => t.length >= 2);
    if (terms.length === 0) return escaped;

    // Build regex from all terms
    const pattern = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');

    const parts: (string | { type: 'mark'; text: string })[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(escaped)) !== null) {
      if (match.index > lastIndex) {
        parts.push(escaped.slice(lastIndex, match.index));
      }
      parts.push({ type: 'mark', text: match[1] });
      lastIndex = pattern.lastIndex;
    }
    if (lastIndex < escaped.length) {
      parts.push(escaped.slice(lastIndex));
    }
    return parts;
  };

  const queryTerms = query.split(' ').filter(t => t.length >= 2).map(t => t.toLowerCase());

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="text-sm text-zinc-400 mb-1.5 block">{label}</label>}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setIsOpen(false); onChange(''); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
          >
            ×
          </button>
        )}
      </div>

      {isOpen && (results.length > 0 || isNewSpecies) && (
        <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl max-h-72 overflow-y-auto">
          {results.map((species, i) => (
            <button
              key={species.id}
              onClick={() => handleSelect(species)}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                i === selectedIndex ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                <Leaf className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {(() => {
                    const parts = highlightMatch(species.scientific_name, queryTerms);
                    if (typeof parts === 'string') return parts;
                    return parts.map((part, idx) =>
                      typeof part === 'string'
                        ? <span key={idx}>{part}</span>
                        : <mark key={idx} className="bg-emerald-500/30 text-emerald-300 rounded px-0.5">{part.text}</mark>
                    );
                  })()}
                </p>
                <p className="text-xs text-zinc-500 truncate">
                  {species.common_name_en} {species.common_name_th && `· ${species.common_name_th}`}
                </p>
              </div>
              <div className="ml-auto text-xs text-zinc-600 shrink-0">
                <span className="capitalize">{species.category}</span>
              </div>
            </button>
          ))}

          {isNewSpecies && (
            <button
              onClick={() => {
                setIsOpen(false);
                onChange(query);
              }}
              className="w-full text-left px-4 py-2.5 flex items-center gap-3 border-t border-white/5 hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-400">Use "{query}" as custom species</p>
                <p className="text-xs text-zinc-500">This species will be added to our database</p>
              </div>
            </button>
          )}
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !isNewSpecies && (
        <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl p-4 text-center">
          <p className="text-sm text-zinc-500">No matches found. Keep typing to add as custom.</p>
        </div>
      )}
    </div>
  );
}
