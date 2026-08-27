// Shared Stripe.js singleton. loadStripe() is expensive to call more than
// once, so both CheckoutPage (marketplace escrow payments) and BoostModal
// (platform ad revenue, always Stripe regardless of STRIPE_CHECKOUT_ENABLED)
// reuse this same promise rather than each creating their own.
import { loadStripe } from '@stripe/stripe-js';

export const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

// Key-presence check only — whether a given Stripe-backed flow is actually
// offered still depends on that flow's own feature gate, if it has one.
export const STRIPE_KEY_CONFIGURED = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
