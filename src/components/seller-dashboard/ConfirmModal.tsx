'use client'

import { useTranslation } from 'react-i18next';

interface ConfirmModalProps {
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText: string;
}

export function ConfirmModal({ title, description, onCancel, onConfirm, confirmText }: ConfirmModalProps) {
  const { t } = useTranslation(['common']);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-sm text-zinc-400 mb-6">{description}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg text-sm border border-white/10 hover:bg-white/5">{t('common:actions.cancel')}</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-black">{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
