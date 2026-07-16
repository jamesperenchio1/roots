import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { updateProfile } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { loadThaiResources, type SupportedLanguage } from '@/i18n/config';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation('common');
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const changeLanguage = async (lang: SupportedLanguage) => {
    setLoading(true);
    try {
      if (lang === 'th' && !i18n.hasResourceBundle('th', 'common')) {
        await loadThaiResources();
      }
      await i18n.changeLanguage(lang);
      localStorage.setItem('roots-language', lang);
      if (user && !user.is_admin) {
        await updateProfile(user.id, { language_preference: lang });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-zinc-400 hover:text-white hover:bg-white/5">
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">{i18n.language === 'th' ? 'ไทย' : 'EN'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
        <DropdownMenuItem
          onClick={() => changeLanguage('en')}
          className={`text-sm ${i18n.language === 'en' ? 'text-emerald-400' : 'text-zinc-300'} focus:text-white focus:bg-white/5`}
        >
          {t('language.en')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => changeLanguage('th')}
          className={`text-sm ${i18n.language === 'th' ? 'text-emerald-400' : 'text-zinc-300'} focus:text-white focus:bg-white/5`}
        >
          {t('language.th')}
        </DropdownMenuItem>
      </DropdownMenuContent>
      {loading && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-zinc-900 border border-white/10 rounded-xl px-6 py-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-emerald-500 animate-spin motion-reduce:animate-none" />
            <span className="text-sm text-zinc-300">{t('actions.loading')}</span>
          </div>
        </div>
      )}
    </DropdownMenu>
  );
}
