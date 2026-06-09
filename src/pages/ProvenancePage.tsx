import { Link } from 'react-router-dom';
import { QrCode, Shield, History, BadgeCheck, ArrowLeft } from 'lucide-react';

// The single, canonical explanation of Root Provenance. Everywhere else links
// here instead of repeating the copy.
export default function ProvenancePage() {
  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 max-w-3xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white mb-8">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <QrCode className="w-6 h-6 text-emerald-400" />
        </div>
        <h1 className="text-3xl font-light tracking-tight">Root Provenance</h1>
      </div>
      <p className="text-zinc-400 mb-10 leading-relaxed">
        A permanent, verifiable record of a plant's identity and ownership — a digital
        birth certificate that travels with the plant for life.
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mb-12">
        {[
          { icon: BadgeCheck, title: 'Verified identity', desc: 'Each plant gets a unique QR tag tied to its first listing and photos.' },
          { icon: History, title: 'Full history', desc: 'Every sale and owner is recorded, so the chain of custody is never lost.' },
          { icon: Shield, title: 'Fraud protection', desc: 'Buyers can confirm a plant is the one that was actually listed and sold.' },
        ].map((c) => (
          <div key={c.title} className="bg-zinc-900/30 border border-white/5 rounded-xl p-5">
            <c.icon className="w-5 h-5 text-emerald-400 mb-3" />
            <h3 className="font-medium mb-1">{c.title}</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">{c.desc}</p>
          </div>
        ))}
      </div>

      <div className="space-y-8 text-zinc-300 leading-relaxed">
        <section>
          <h2 className="text-xl font-medium mb-2 text-white">Why provenance matters for plants</h2>
          <p className="text-zinc-400">
            The second-hand and collector plant market runs on trust. A buyer paying a premium for a
            highly-variegated Monstera or a mature aroid is trusting the seller's claims about the
            plant's maturity, variegation stability, and care history — claims that are easy to
            exaggerate and hard to verify. Provenance replaces "trust me" with a record.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium mb-2 text-white">How it works</h2>
          <ol className="list-decimal list-inside space-y-2 text-zinc-400">
            <li>When a plant is listed, Root generates a unique QR code and ties it to the listing's photos, species, and seller.</li>
            <li>The seller attaches the printed QR tag to the physical plant before shipping.</li>
            <li>Each completed sale appends a new entry to the plant's chain — the new owner, date, and price.</li>
            <li>Anyone scanning the tag sees the plant's full timeline: who grew it, when it changed hands, and for how much.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-medium mb-2 text-white">What it protects against</h2>
          <p className="text-zinc-400">
            Provenance makes it far harder to pass off a different (often lesser) plant than the one
            advertised, to fake a plant's age or lineage, or to launder a stolen specimen. Sellers
            build a verifiable reputation through real, recorded sales rather than screenshots.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium mb-2 text-white">Ownership &amp; privacy</h2>
          <p className="text-zinc-400">
            The chain records pseudonymous seller/buyer handles and transaction metadata — not your
            home address or payment details. You control what's shown on your public profile.
          </p>
        </section>
      </div>

      <div className="mt-12 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6 text-center">
        <p className="text-sm text-zinc-300 mb-4">Every plant on Root can carry its own provenance tag.</p>
        <Link to="/sell" className="inline-flex items-center gap-2 bg-emerald-500 text-black px-5 py-2.5 rounded-full text-sm font-medium hover:bg-emerald-600 transition-colors">
          List a plant
        </Link>
      </div>
    </div>
  );
}
