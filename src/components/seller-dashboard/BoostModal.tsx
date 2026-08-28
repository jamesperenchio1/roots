'use client'

import { useState } from 'react';
import { format } from 'date-fns';
import { X, Rocket, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

import type { Listing } from '@/types';
import { BOOST_TIERS } from '@/lib/boost';
import { createBoostPaymentIntent } from '@/lib/api';
import { stripePromise, STRIPE_KEY_CONFIGURED } from '@/lib/stripeClient';
import { queryClient } from '@/lib/queryClient';
import { publicKeys, userKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';

interface BoostModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
}

// Maps each BOOST_TIERS entry (by its `hours` value) to the matching i18n
// key in dashboard.json, so the modal renders a localized duration label
// instead of the hardcoded English `tier.label` string from src/lib/boost.ts.
const TIER_LABEL_KEYS: Record<number, string> = {
  24: 'dashboard:seller.boost.tier24h',
  72: 'dashboard:seller.boost.tier3d',
  168: 'dashboard:seller.boost.tier7d',
};

function tierLabelKey(hours: number): string | undefined {
  return TIER_LABEL_KEYS[hours];
}

function makeTierLabelGetter(t: (key: string, opts?: { defaultValue: string }) => string) {
  return (tier: { hours: number; label: string }) => {
    const key = tierLabelKey(tier.hours);
    return key ? t(key, { defaultValue: tier.label }) : tier.label;
  };
}

function BoostPaymentForm({ onPaid }: { onPaid: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useTranslation(['dashboard', 'common']);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/seller-dashboard/listings` },
      redirect: 'if_required',
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || t('dashboard:seller.boost.error'));
      return;
    }
    onPaid();
  };

  return (
    <div>
      <PaymentElement options={{ layout: 'tabs' }} />
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-black font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
      >
        {submitting ? t('dashboard:seller.boost.processing') : t('dashboard:seller.boost.payAndBoost')}
      </button>
    </div>
  );
}

export function BoostModal({ listing, isOpen, onClose }: BoostModalProps) {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const { user } = useAuth();
  const [tierIndex, setTierIndex] = useState(0);
  const [starting, setStarting] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [pending, setPending] = useState(false);

  if (!isOpen) return null;

  const tier = BOOST_TIERS[tierIndex];
  const getTierLabel = makeTierLabelGetter(t);
  const isCurrentlyBoosted = !!listing.boosted_until && new Date(listing.boosted_until).getTime() > Date.now();

  const handleClose = () => {
    setClientSecret('');
    setPending(false);
    setTierIndex(0);
    onClose();
  };

  const handleStart = async () => {
    if (!user) return;
    setStarting(true);
    try {
      const pi = await createBoostPaymentIntent(listing.id, tierIndex);
      setClientSecret(pi.clientSecret);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('dashboard:seller.boost.error'));
    } finally {
      setStarting(false);
    }
  };

  const handlePaid = () => {
    setPending(true);
    toast.success(t('dashboard:seller.boost.success'));
    if (user) {
      queryClient.invalidateQueries({ queryKey: userKeys.sellerListings(user.id) });
    }
    queryClient.invalidateQueries({ queryKey: publicKeys.listing(listing.id) });
    queryClient.invalidateQueries({ queryKey: publicKeys.all() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Rocket className="w-5 h-5 text-amber-400" />
            {t('dashboard:seller.boost.title')}
          </h3>
          <button onClick={handleClose} className="text-zinc-500 hover:text-white" aria-label={t('common:actions.close')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-zinc-500 mb-5">{t('dashboard:seller.boost.subtitle')}</p>

        {isCurrentlyBoosted && (
          <div className="mb-5 flex items-center gap-2 text-sm text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>
              {t('dashboard:seller.boost.currentlyBoosted', {
                date: format(new Date(listing.boosted_until as string), 'dd MMM yyyy, HH:mm'),
              })}
            </span>
          </div>
        )}

        {pending ? (
          <p className="text-sm text-zinc-400 text-center py-6">{t('dashboard:seller.boost.pending')}</p>
        ) : !STRIPE_KEY_CONFIGURED ? (
          <p className="text-sm text-amber-400 text-center py-6">{t('dashboard:seller.boost.unavailable')}</p>
        ) : clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
            <BoostPaymentForm onPaid={handlePaid} />
          </Elements>
        ) : (
          <>
            <div className="mb-2">
              <input
                type="range"
                min={0}
                max={BOOST_TIERS.length - 1}
                step={1}
                value={tierIndex}
                onChange={(e) => setTierIndex(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-xs text-zinc-600 mt-1">
                {BOOST_TIERS.map((bt, i) => (
                  <span key={i} className={i === tierIndex ? 'text-amber-400 font-medium' : ''}>
                    {getTierLabel(bt)}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-6 mt-4 bg-zinc-800/30 border border-white/5 rounded-lg p-3 text-center">
              <p className="text-sm font-medium text-white">
                {t('dashboard:seller.boost.summary', {
                  amount: tier.amountThb.toLocaleString(i18n.language),
                  duration: getTierLabel(tier),
                })}
              </p>
            </div>

            <button
              onClick={handleStart}
              disabled={starting}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {starting
                ? t('dashboard:seller.boost.processing')
                : isCurrentlyBoosted
                  ? t('dashboard:seller.boost.addMoreTime')
                  : t('dashboard:seller.boost.payAndBoost')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
