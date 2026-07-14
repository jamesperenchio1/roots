import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Message } from '@/types';

interface MessageSearchProps {
  onSearch: (query: string) => Promise<Message[]>;
  onJump: (messageId: string) => void;
  onClose: () => void;
}

export default function MessageSearch({ onSearch, onJump, onClose }: MessageSearchProps) {
  const { t } = useTranslation(['messages']);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const msgs = await onSearch(query.trim());
      setResults(msgs);
    } finally {
      setLoading(false);
    }
  }, [query, onSearch]);

  return (
    <div className="bg-zinc-900/95 border-b border-white/10 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch();
            }}
            placeholder={t('messages:search')}
            className="pl-9 bg-zinc-800 border-white/10 text-white placeholder-zinc-600"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
          {t('messages:searchButton')}
        </Button>
        <Button onClick={onClose} variant="ghost" size="icon" className="text-zinc-500 hover:text-white">
          <X className="w-4 h-4" />
        </Button>
      </div>
      {results.length > 0 && (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {results.map((msg) => (
            <button
              key={msg.id}
              onClick={() => {
                onJump(msg.id);
                onClose();
              }}
              className="w-full text-left px-3 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-sm"
            >
              <p className="text-zinc-300 truncate">{msg.content}</p>
              <p className="text-xs text-zinc-500">{new Date(msg.created_at).toLocaleString()}</p>
            </button>
          ))}
        </div>
      )}
      {query && !loading && results.length === 0 && (
        <p className="text-xs text-zinc-500 px-1">{t('messages:searchEmpty')}</p>
      )}
    </div>
  );
}
