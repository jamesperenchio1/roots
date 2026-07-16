import { Leaf } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PageLoaderProps {
  fullScreen?: boolean;
}

export function PageLoader({ fullScreen = false }: PageLoaderProps) {
  const { t } = useTranslation('common');
  const wrapperClasses = fullScreen
    ? 'min-h-screen'
    : 'min-h-[60vh]';

  return (
    <div className={`${wrapperClasses} flex flex-col items-center justify-center gap-4 bg-black text-white px-4`}>
      <div className="flex items-center gap-2 animate-pulse motion-reduce:animate-none">
        <Leaf className="w-8 h-8 text-emerald-500" />
        <span className="text-xl font-semibold tracking-tight">ROOTS</span>
      </div>
      <p className="text-sm text-zinc-500">{t('actions.loading')}</p>
    </div>
  );
}
