import { Shield, TrendingUp, Truck, QrCode, Zap, Heart } from 'lucide-react';

const STATS = [
  { value: '47K+', label: 'Plants Listed' },
  { value: '12K+', label: 'Happy Buyers' },
  { value: '8,400+', label: 'Sellers Active' },
  { value: '฿24M', label: 'GMV to Date' },
];

const VALUES = [
  { icon: Shield, title: 'Transparency First', desc: 'Every sale feeds into public price history. No hidden deals, no whisper networks. The market decides what a plant is worth.' },
  { icon: QrCode, title: 'Permanent Provenance', desc: 'Every plant gets a QR code at first listing. Scan it and see its entire ownership history — every seller, every price, forever.' },
  { icon: TrendingUp, title: 'Data for Everyone', desc: 'Before you buy, see 180 days of price history. Before you sell, see where your price sits against the market median.' },
  { icon: Truck, title: 'Escrow Protection', desc: 'Pay via PromptPay, funds held in escrow until you confirm delivery with a QR scan. Sellers get paid, buyers get protection.' },
  { icon: Zap, title: '8% Flat Fee', desc: 'No listing fees, no monthly subscriptions, no featured placement charges. We take 8% when you sell. That is it.' },
  { icon: Heart, title: 'For Every Plant', desc: 'From a 10-baht basil cutting to a 50,000-baht variegated monstera. If it grows, it belongs here.' },
];

const TEAM = [
  { name: 'Thawanrat S.', role: 'Founder & CEO', bio: 'Plant collector turned marketplace builder. Grew her first monstera from a cutting in 2018.' },
  { name: 'Pongsiri K.', role: 'Head of Engineering', bio: 'Built Thailand\'s first QR plant provenance system. Former fintech engineer.' },
  { name: 'Malai T.', role: 'Community Lead', bio: 'Manages seller onboarding and dispute resolution. 15 years in Thai e-commerce.' },
  { name: 'Chanida P.', role: 'Botanical Advisor', bio: 'Agricultural scientist ensuring species data accuracy across the platform.' },
];

export default function AboutPage() {
  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight mb-4">About Root</h1>
          <p className="text-zinc-500 max-w-2xl mx-auto text-lg leading-relaxed">
            Root is Thailand's plant marketplace built on two simple ideas: every plant deserves a permanent identity,
            and every buyer deserves to know what a fair price looks like. We are not a rare-plant club. We are for
            the basil cutting and the variegated monstera and everything between.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-16">
          {STATS.map((s, i) => (
            <div key={i} className="bg-zinc-900/30 border border-white/5 rounded-xl p-5 text-center">
              <p className="text-2xl font-semibold text-emerald-400">{s.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Origin Story */}
        <div className="mb-16">
          <h2 className="text-xl font-medium mb-4">How We Started</h2>
          <div className="space-y-4 text-zinc-400 leading-relaxed">
            <p>
              In 2022, Thawanrat bought a Monstera Thai Constellation from a Facebook group for 18,000 THB.
              Six months later she sold it for 12,000. Was that fair? She had no idea — there was no price data,
              no market reference, just whatever the buyer was willing to pay.
            </p>
            <p>
              Meanwhile, Pongsiri was tracking his plant collection in a spreadsheet, manually logging every
              purchase, every propagation, every sale. He dreamed of a system where each plant carried its own
              history — not in a spreadsheet, but physically, on the plant itself.
            </p>
            <p>
              They met at a plant swap in Chatuchak and spent the next 18 months building Root.
              The QR provenance system was first: every plant gets a unique QR code at listing,
              and every ownership transfer is recorded permanently. Then came the price history graphs —
              inspired by Steam's marketplace — showing real transaction data so buyers and sellers
              could make informed decisions.
            </p>
            <p>
              Root launched in Bangkok in early 2024. Within three months we had sellers in Chiang Mai,
              Phuket, Khon Kaen, and Udon Thani. Today we list everything from 10-baht basil seedlings to
              45,000-baht specimen plants. If it grows in Thailand, it has a home here.
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="mb-16">
          <h2 className="text-xl font-medium mb-6">What We Believe</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {VALUES.map((v, i) => (
              <div key={i} className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
                <v.icon className="w-6 h-6 text-emerald-400 mb-3" />
                <h3 className="font-medium mb-2">{v.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div className="mb-16">
          <h2 className="text-xl font-medium mb-6">The Team</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {TEAM.map((t, i) => (
              <div key={i} className="flex gap-4 bg-zinc-900/30 border border-white/5 rounded-xl p-4">
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-medium shrink-0">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-emerald-400 mb-1">{t.role}</p>
                  <p className="text-sm text-zinc-500">{t.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-8 text-center">
          <h2 className="text-xl font-medium mb-3">Join the marketplace</h2>
          <p className="text-zinc-500 mb-6">
            Whether you are selling your first propagation or running a full nursery,
            Root gives you the tools to sell with transparency and confidence.
          </p>
          <div className="flex justify-center gap-3">
            <a href="/signup" className="bg-white text-black px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors">Create Account</a>
            <a href="/seller-dashboard" className="border border-white/20 px-6 py-2.5 rounded-lg text-sm hover:bg-white/5 transition-colors">Seller Dashboard</a>
          </div>
        </div>
      </div>
    </div>
  );
}
