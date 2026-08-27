'use client'

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

import { ArrowLeft, Shield, CreditCard, MessagesSquare, Truck, Lock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useListing } from '@/hooks/queries/useListings';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { createOrder, createStripePaymentIntent, updateOrderStatus } from '@/lib/api';
import { validateShippingAddress } from '@/lib/validation';
import { supabase } from '@/lib/supabase/client';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { STRIPE_CHECKOUT_ENABLED } from '@/lib/platform-config';
import { stripePromise, STRIPE_KEY_CONFIGURED } from '@/lib/stripeClient';
import { PromptPayVerifiedBadge } from '@/components/PromptPayVerifiedBadge';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_MS = 10 * 60 * 1000;

// Whether the Stripe tab is actually offered to buyers also requires
// STRIPE_CHECKOUT_ENABLED (a deliberate ops toggle, independent of
// Boost/paid-listing-promotion which always uses Stripe).
const STRIPE_CHECKOUT_AVAILABLE = STRIPE_CHECKOUT_ENABLED && STRIPE_KEY_CONFIGURED;

function StripePaymentForm({ onPaid, totalLabel }: { onPaid: () => void; totalLabel: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const { t } = useTranslation(['checkout', 'common']);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/checkout/complete` },
      redirect: 'if_required',
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || t('checkout:checkout.orderError'));
      return;
    }
    onPaid();
  };

  return (
    <div>
      <PaymentElement options={{ layout: 'tabs' }} />
      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-black font-medium h-12 rounded-xl text-base"
      >
        {submitting ? t('checkout:confirming') : totalLabel}
      </Button>
    </div>
  );
}

export default function CheckoutPage() {
  const { listingId } = useParams<{ listingId?: string }>() ?? { listingId: '' };
  const { data: listing } = useListing(listingId);
  const { user } = useAuth();
  const { t } = useTranslation(['checkout', 'common']);
  const router = useRouter();
  const [address, setAddress] = useState({ name: '', address: '', district: '', province: '', postal: '', phone: '' });
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'direct'>(
    STRIPE_CHECKOUT_AVAILABLE ? 'stripe' : 'direct'
  );
  const [paying, setPaying] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [orderId, setOrderId] = useState('');
  const pollStartRef = useRef<number>(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shipping = listing?.shipping_cost_thb || 0;
  const total = (listing?.price_thb || 0) + shipping;
  const isOwnListing = user?.id === listing?.seller_id;

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  if (!listing) {
    return (
      <div className="pt-24 pb-16 px-4 text-center">
        <h1 className="text-2xl mb-4">{t('checkout:listingNotFound')}</h1>
        <Link href="/browse" className="text-emerald-400 hover:underline">{t('checkout:backToBrowse')}</Link>
      </div>
    );
  }

  const startPolling = (id: string) => {
    pollStartRef.current = Date.now();

    const poll = async () => {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('payment_confirmed,status')
          .eq('id', id)
          .single();
        if (error) throw error;
        if (data && (data.payment_confirmed === true || data.status === 'paid_in_escrow')) {
          router.push(`/order/${id}`);
          return;
        }
      } catch {
        // Keep polling; the webhook will eventually update the row.
      }
      if (Date.now() - pollStartRef.current < MAX_POLL_MS) {
        pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();
  };

  const handlePay = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (isOwnListing) {
      toast.error(t('checkout:errors.ownListing'));
      return;
    }
    const validation = validateShippingAddress(address);
    setAddressErrors(validation.errors);
    if (!validation.ok) {
      toast.error(t('checkout:errors.fixAddress'));
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!user || !listing) return;
    setShowConfirmModal(false);
    setPaying(true);
    let createdOrderId: string | undefined;
    try {
      const tx = await createOrder({
        listing,
        buyer: user,
        delivery_method: listing.delivery_options?.includes('ship') ? 'ship' : 'pickup',
        shipping_address: address,
        payment_method: paymentMethod,
      });
      setOrderId(tx.id);
      createdOrderId = tx.id;

      if (paymentMethod === 'direct') {
        // Direct / P2P payment — no platform money movement.
        toast.success(t('checkout:toast.orderCreated'));
        router.push(`/order/${tx.id}`);
        setPaying(false);
        return;
      }

      const pi = await createStripePaymentIntent(tx.id);
      setClientSecret(pi.clientSecret);
      toast.success(t('checkout:toast.orderCreated'));
      setPaying(false);
    } catch (err) {
      // If the order was created but the payment intent failed, cancel the order
      // so the listing is restored to 'active' and the buyer can retry.
      if (createdOrderId) {
        updateOrderStatus(createdOrderId, { status: 'cancelled' }).catch(() => {});
      }
      toast.error(err instanceof Error ? err.message : t('checkout:checkout.orderError'));
      setPaying(false);
    }
  };

  const handleStripePaid = () => {
    if (orderId) startPolling(orderId);
  };

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <Link href={`/listing/${listingId}`} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('checkout:backToListing')}
        </Link>

        <h1 className="text-2xl font-light tracking-tight mb-6">{t('checkout:checkout.title')}</h1>

        {/* Order Summary */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-6">
          <div className="flex gap-4 mb-4">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
              <img src={listing.photos?.[0]?.storage_path || '/images/plants/monstera-thai.jpg'} alt={listing.species?.scientific_name || t('common:unknown')} loading="lazy" decoding="async" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-medium">{listing.species?.common_name_en}</p>
              <p className="text-xs text-zinc-500">{listing.species?.scientific_name}</p>
              <p className="text-xs text-zinc-500">{t('checkout:labels.size')}: {listing.size_category} {listing.pot_size_cm && `| ${t('checkout:labels.pot')}: ${listing.pot_size_cm}cm`}</p>
              <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                <span>{t('checkout:labels.seller')}: {listing.seller?.display_name}</span>
                {listing.seller?.promptpay_id && <PromptPayVerifiedBadge />}
              </p>
            </div>
          </div>
          <div className="border-t border-white/5 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">{t('checkout:checkout.plant')}</span>
              <span>{listing.price_thb.toLocaleString()} {t('common:currency')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">{t('checkout:checkout.shipping')}</span>
              <span className={shipping === 0 ? 'text-emerald-400' : ''}>
                {shipping === 0 ? t('checkout:order.freeShipping') : `${shipping.toLocaleString()} ${t('common:currency')}`}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-white/5 font-semibold text-base">
              <span>{t('checkout:checkout.total')}</span>
              <span>{total.toLocaleString()} {t('common:currency')}</span>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Truck className="w-4 h-4 text-zinc-400" />
            {t('checkout:checkout.shippingAddress')}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <input placeholder={t('checkout:checkout.fullName')} className={`bg-black border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 w-full ${addressErrors.name ? 'border-red-500/50' : 'border-white/10'}`} value={address.name} onChange={e => setAddress({ ...address, name: e.target.value })} />
              {addressErrors.name && <p className="text-xs text-red-400 mt-1">{addressErrors.name}</p>}
            </div>
            <div>
              <input placeholder={t('checkout:checkout.phone')} className={`bg-black border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 w-full ${addressErrors.phone ? 'border-red-500/50' : 'border-white/10'}`} value={address.phone} onChange={e => setAddress({ ...address, phone: e.target.value })} />
              {addressErrors.phone && <p className="text-xs text-red-400 mt-1">{addressErrors.phone}</p>}
            </div>
            <div className="sm:col-span-2">
              <input placeholder={t('checkout:checkout.addressLine')} className={`w-full bg-black border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50 ${addressErrors.address ? 'border-red-500/50' : 'border-white/10'}`} value={address.address} onChange={e => setAddress({ ...address, address: e.target.value })} />
              {addressErrors.address && <p className="text-xs text-red-400 mt-1">{addressErrors.address}</p>}
            </div>
            <input placeholder={t('checkout:checkout.district')} className="bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50" value={address.district} onChange={e => setAddress({ ...address, district: e.target.value })} />
            <input placeholder={t('checkout:checkout.province')} className="bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50" value={address.province} onChange={e => setAddress({ ...address, province: e.target.value })} />
            <input placeholder={t('checkout:checkout.postalCode')} className="bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/50" value={address.postal} onChange={e => setAddress({ ...address, postal: e.target.value })} />
          </div>
        </div>

        {/* Payment Block */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            {t('checkout:securePayment')}
          </h2>

          {/* Payment method selector */}
          <div className={`grid gap-3 mb-5 ${STRIPE_CHECKOUT_AVAILABLE ? 'sm:grid-cols-2' : ''}`}>
            {STRIPE_CHECKOUT_AVAILABLE && (
              <button
                type="button"
                onClick={() => setPaymentMethod('stripe')}
                className={`text-left p-4 rounded-xl border transition-colors ${paymentMethod === 'stripe' ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/10 hover:border-white/20'}`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <CreditCard className={`w-4 h-4 ${paymentMethod === 'stripe' ? 'text-emerald-400' : 'text-zinc-400'}`} />
                  <p className="text-sm font-medium">{t('checkout:paymentMethod.stripe')}</p>
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">{t('checkout:paymentMethod.stripeDescription')}</p>
              </button>
            )}
            <button
              type="button"
              onClick={() => setPaymentMethod('direct')}
              className={`text-left p-4 rounded-xl border transition-colors ${paymentMethod === 'direct' ? 'border-amber-500 bg-amber-500/5' : 'border-white/10 hover:border-white/20'}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <MessagesSquare className={`w-4 h-4 ${paymentMethod === 'direct' ? 'text-amber-400' : 'text-zinc-400'}`} />
                <p className="text-sm font-medium">{t('checkout:paymentMethod.direct')}</p>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">{t('checkout:paymentMethod.directDescription')}</p>
            </button>
          </div>

          {paymentMethod === 'direct' && (
            <div className="flex items-start gap-3 text-sm text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 mb-5">
              <Shield className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{t('checkout:paymentMethod.directWarning')}</p>
            </div>
          )}

          {/* Stripe Payment Element */}
          {paymentMethod === 'stripe' && STRIPE_CHECKOUT_AVAILABLE && clientSecret && (
            <div className="text-left py-4 bg-zinc-800/30 rounded-lg border border-white/5 px-4">
              <Elements
                stripe={stripePromise}
                options={{ clientSecret, appearance: { theme: 'night' } }}
              >
                <StripePaymentForm
                  onPaid={handleStripePaid}
                  totalLabel={t('checkout:confirmPaid', { total: total.toLocaleString(), currency: t('common:currency') })}
                />
              </Elements>
            </div>
          )}

          {paymentMethod === 'stripe' && !clientSecret && (
            <div className="text-center py-4 bg-zinc-800/30 rounded-lg border border-white/5 text-sm text-zinc-400">
              {t('checkout:qrWillAppear')}
            </div>
          )}

          {paymentMethod === 'direct' && (
            <div className="text-center py-4 bg-zinc-800/30 rounded-lg border border-white/5 text-sm text-zinc-400">
              {t('checkout:paymentMethod.directDescription')}
            </div>
          )}
        </div>

        {/* Escrow Notice */}
        {paymentMethod === 'stripe' && (
          <div className="flex items-start gap-3 text-sm text-zinc-500 mb-6 bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-4">
            <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-emerald-400 font-medium mb-0.5">{t('checkout:buyerProtection.title')}</p>
              <p>{t('checkout:buyerProtection.description')}</p>
            </div>
          </div>
        )}

        {isOwnListing && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6 text-sm text-amber-400">
            {t('checkout:errors.ownListing')}
          </div>
        )}

        <Button
          onClick={handlePay}
          disabled={paying || isOwnListing || !!clientSecret}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-medium h-12 rounded-xl text-base"
        >
          {paying ? t('checkout:confirming') : clientSecret ? t('checkout:completePayment') : t('checkout:confirmPaid', { total: total.toLocaleString(), currency: t('common:currency') })}
        </Button>

        <p className="text-xs text-zinc-500 text-center mt-3">
          {t('checkout:footer')}
        </p>
      </div>

      {/* Payment Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                {t('checkout:confirmPayment.title')}
              </h3>
            </div>

            <p className="text-sm text-zinc-400 mb-6">
              {t('checkout:confirmPayment.description', { total: total.toLocaleString(), currency: t('common:currency') })}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={paying}
                className="flex-1 py-2.5 rounded-lg text-sm border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {t('common:actions.cancel')}
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={paying}
                className="flex-1 py-2.5 rounded-lg text-sm bg-emerald-500 text-black font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {paying ? t('checkout:confirmPayment.submitting') : t('checkout:confirmPayment.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}