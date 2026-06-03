import { CheckCircle, XCircle } from 'lucide-react';

export default function FeesPage() {
  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight mb-4">Simple, Transparent Fees</h1>
          <p className="text-zinc-500">8% from sellers only. No hidden costs, no monthly fees.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 mb-12">
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-8">
            <h2 className="text-lg font-medium mb-2">Buyers</h2>
            <p className="text-4xl font-light text-emerald-400 mb-4">Free</p>
            <ul className="space-y-3">
              {['Browse all listings', 'View price history graphs', 'Use watchlist & alerts', 'Escrow protection included', 'QR provenance verification'].map(item => (
                <li key={item} className="flex items-center gap-2 text-sm text-zinc-400">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-8">
            <h2 className="text-lg font-medium mb-2">Sellers</h2>
            <p className="text-4xl font-light text-amber-400 mb-1">8%</p>
            <p className="text-sm text-zinc-500 mb-4">of sale price only when sold</p>
            <ul className="space-y-3">
              {['Unlimited free listings', 'QR provenance tag generation', 'Price history integration', 'Escrow & dispute handling', 'PromptPay payouts'].map(item => (
                <li key={item} className="flex items-center gap-2 text-sm text-zinc-400">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-medium mb-4">Example Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Plant sold for</span>
              <span>10,000 THB</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Platform fee (8%)</span>
              <span className="text-red-400">-800 THB</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">You receive</span>
              <span className="text-emerald-400 font-medium">9,200 THB</span>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-zinc-600 mb-4">We don't charge for:</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['Listing fees', 'Monthly subscriptions', 'Featured placement', 'Withdrawal fees', 'Currency conversion'].map(item => (
              <span key={item} className="flex items-center gap-1 text-xs text-zinc-500 bg-zinc-900/50 px-3 py-1.5 rounded-full">
                <XCircle className="w-3 h-3" /> {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
