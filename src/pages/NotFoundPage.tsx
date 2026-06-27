import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation(['common']);

  return (
    <div className="pt-24 pb-16 px-4 min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <Leaf className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
        <h1 className="text-4xl font-light mb-2">404</h1>
        <p className="text-zinc-500 mb-6">{t('common:notFound.message')}</p>
        <Link to="/" className="text-emerald-400 hover:underline text-sm">{t('common:notFound.backHome')}</Link>
      </div>
    </div>
  );
}
