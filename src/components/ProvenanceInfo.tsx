import { Link } from 'react-router-dom';
import { QrCode } from 'lucide-react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card';

// A Wikipedia-style "what is this?" affordance: hover for a mini summary, click
// through to the full white paper at /provenance. Used anywhere we mention the
// QR provenance tag so the explanation lives in exactly one place.
export default function ProvenanceInfo({ label = 'What is this?' }: { label?: string }) {
  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>
        <Link to="/provenance" className="text-emerald-400 hover:underline text-xs cursor-help">
          {label}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 bg-zinc-900 border-white/10 text-zinc-300">
        <div className="flex gap-3">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <QrCode className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white mb-1">Root Provenance</p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              A permanent QR tag — a plant's digital birth certificate. Scanning it reveals the
              full history: who grew it, when it sold, and every owner since. It's how buyers
              verify a seller's claims and how rare plants keep their value across owners.
            </p>
            <Link to="/provenance" className="inline-block mt-2 text-xs text-emerald-400 hover:underline">
              Read the full white paper →
            </Link>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
