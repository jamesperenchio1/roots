'use client'

import { useState, useEffect } from 'react';
import type { TFunction } from 'i18next';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { updateProfile } from '@/lib/api';
import { isValidPromptPayId } from '@/lib/validation';
import type { Profile } from '@/types';

interface AccountTabProps {
  me?: Profile;
  t: TFunction;
}

export function AccountTab({ me, t }: AccountTabProps) {
  const { user, refreshProfile } = useAuth();
  const [promptpayId, setPromptpayId] = useState(user?.promptpay_id ?? '');
  const [location, setLocation] = useState(me?.location ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPromptpayId(user?.promptpay_id ?? '');
  }, [user?.promptpay_id]);

  const handleSave = async () => {
    if (!user) return;
    if (promptpayId.trim() && !isValidPromptPayId(promptpayId.trim())) {
      toast.error(t('common:errors.invalidPromptPay'));
      return;
    }
    setSaving(true);
    try {
      await updateProfile(user.id, { promptpay_id: promptpayId.trim() || null, location: location.trim() || undefined, updated_at: new Date().toISOString() });
      await refreshProfile();
      toast.success(t('dashboard:buyer.settingsSaved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common:errors.generic'));
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
        <h3 className="font-medium mb-4">{t('dashboard:seller.paymentSettings')}</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1.5 block">{t('auth:signup.promptpayId')}</label>
            <input type="text" value={promptpayId} onChange={(e) => setPromptpayId(e.target.value)} placeholder={t('dashboard:seller.promptpayPlaceholder')} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50" />
            <p className="text-xs text-zinc-600 mt-1">{t('dashboard:seller.payoutDestination')}</p>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
        <h3 className="font-medium mb-4">{t('dashboard:seller.shippingSettings')}</h3>
        <div>
          <label className="text-sm text-zinc-400 mb-1.5 block">{t('auth:signup.location')}</label>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t('auth:signup.location')} className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50" />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="bg-white text-black px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50">
        {saving ? t('common:actions.saving') : t('common:actions.save')}
      </button>
    </div>
  );
}
