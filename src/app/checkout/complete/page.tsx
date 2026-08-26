'use client'

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function CheckoutCompleteView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const clientSecret = searchParams.get('payment_intent_client_secret') || '';
    const paymentIntentId = searchParams.get('payment_intent') || '';
    const fallbackOrderId = searchParams.get('order_id') || '';

    (async () => {
      let orderId = fallbackOrderId;
      try {
        const stripe = await stripePromise;
        if (stripe && (clientSecret || paymentIntentId)) {
          const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret || paymentIntentId);
          const metadata = (paymentIntent as unknown as { metadata?: Record<string, string> }).metadata;
          if (metadata?.order_id) {
            orderId = metadata.order_id;
          }
        }
        if (!orderId) {
          if (!cancelled) setFailed(true);
          return;
        }
        if (!cancelled) router.replace(`/order/${orderId}`);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => { cancelled = true; };
  }, [router, searchParams]);

  if (failed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl">Payment could not be confirmed</h1>
        <p className="text-sm text-zinc-500">Please check your order or try again.</p>
        <Link href="/">
          <Button variant="outline">Back to home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <CheckoutCompleteView />
    </Suspense>
  );
}