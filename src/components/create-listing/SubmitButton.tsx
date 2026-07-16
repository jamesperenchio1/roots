import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface SubmitButtonProps {
  submitting: boolean;
}

export default function SubmitButton({ submitting }: SubmitButtonProps) {
  const { t } = useTranslation(['marketplace', 'common']);

  return (
    <Button
      type="submit"
      disabled={submitting}
      className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-medium h-12 rounded-xl text-base"
    >
      {submitting ? t('marketplace:create.publishing') : t('marketplace:create.submitButton')}
    </Button>
  );
}
