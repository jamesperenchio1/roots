import { Link } from 'react-router-dom';
import { QrCode, ShoppingCart, Truck, ScanLine, Shield, TrendingUp } from 'lucide-react';

const STEPS = [
  {
    icon: ShoppingCart,
    title: '1. Browse & Buy',
    desc: 'Explore rare plants from sellers across Thailand. Every listing shows a price history graph so you know if you\'re getting a fair deal. Filter by species, size, price, and location.',
    color: 'text-emerald-400',
  },
  {
    icon: QrCode,
    title: '2. Seller Lists with QR Tag',
    desc: 'When a seller creates a listing, we generate a unique QR code for that physical plant. The seller prints and attaches it to the pot. This QR becomes the plant\'s permanent digital identity.',
    color: 'text-purple-400',
  },
  {
    icon: Shield,
    title: '3. Secure Escrow Payment',
    desc: 'Pay via PromptPay or card. Your money is held in escrow — the seller only receives it after you confirm delivery. Platform fee is 8%, taken from the seller\'s side only.',
    color: 'text-blue-400',
  },
  {
    icon: Truck,
    title: '4. Seller Ships with QR',
    desc: 'The seller packs the plant with its QR tag attached and ships via your chosen courier. You\'ll receive a tracking number to monitor delivery.',
    color: 'text-amber-400',
  },
  {
    icon: ScanLine,
    title: '5. You Scan to Confirm',
    desc: 'When the plant arrives, scan the QR code with your phone to verify it\'s the same plant from the listing. Upload 1-3 receipt photos, then confirm delivery to release funds.',
    color: 'text-cyan-400',
  },
  {
    icon: TrendingUp,
    title: '6. Price History Updates',
    desc: 'Your purchase price is anonymously added to the species price history graph. Future buyers can see market trends, and you can track your plant\'s value over time.',
    color: 'text-pink-400',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight mb-4">How Root Works</h1>
          <p className="text-zinc-500 max-w-lg mx-auto">
            Buy and sell plants the easy way. QR verification, escrow protection,
            and price history so you know you are getting a fair deal.
          </p>
        </div>

        <div className="space-y-12">
          {STEPS.map((step, i) => (
            <div key={i} className="flex gap-6">
              <div className="shrink-0">
                <div className={`w-14 h-14 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center ${step.color}`}>
                  <step.icon className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-medium mb-2">{step.title}</h2>
                <p className="text-zinc-400 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-zinc-900/30 border border-white/5 rounded-xl p-8 text-center">
          <h2 className="text-xl font-medium mb-3">Ready to start?</h2>
          <p className="text-zinc-500 mb-6">
            Create an account to browse, buy, sell, and start building your plant's provenance history.
          </p>
          <div className="flex justify-center gap-3">
            <Link to="/signup" className="bg-white text-black px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors">
              Sign Up
            </Link>
            <Link to="/browse" className="border border-white/20 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-white/5 transition-colors">
              Browse Plants
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
