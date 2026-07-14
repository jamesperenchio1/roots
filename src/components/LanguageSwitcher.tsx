import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
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

  const changeLanguage = async (lang: SupportedLanguage) => {
    if (lang === 'th' && !i18n.hasResourceBundle('th', 'common')) {
      await loadThaiResources();
    }
    await i18n.changeLanguage(lang);
    localStorage.setItem('roots-language', lang);
    if (user && !user.is_admin) {
      await updateProfile(user.id, { language_preference: lang });
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
    </DropdownMenu>
  );
}
