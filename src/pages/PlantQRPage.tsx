import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, QrCode, Calendar, User, Tag, AlertTriangle } from 'lucide-react';
import { getSpeciesById, PLANT_IMAGES, USERS } from '@/data/mockData';
import { fetchProvenance } from '@/lib/api';
import { generateQR } from '@/lib/promptpay';
import { PriceChart } from '@/components/PriceChart';
import { getPriceSnapshotsForSpecies } from '@/data/mockData';
import type { Listing, Transfer } from '@/types';

interface ProvenanceEvent {
  date: string;
  event: string;
  from: string | null;
  to: string | null;
  price: number | null;
  type: 'origin' | 'sale' | 'current';
}

export default function PlantQRPage() {
  const { plantId } = useParams<{ plantId: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [events, setEvents] = useState<ProvenanceEvent[]>([]);
  const [qrUrl, setQrUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<{ date: string; type: string; description: string }[]>([]);

  const speciesId = plantId?.replace('p-', 'sp-') || '';
  const species = getSpeciesById(speciesId);

  useEffect(() => {
    if (!plantId) return;

    // Generate QR for this page URL
    const pageUrl = `${window.location.origin}/#/p/${plantId}`;
    generateQR(pageUrl, 200).then(setQrUrl).catch(() => setQrUrl(''));

    // Fetch provenance
    fetchProvenance(plantId).then(({ listing: l, transfers }) => {
      setListing(l);
      setLoading(false);

      // Build events from transfers
      const provenanceEvents: ProvenanceEvent[] = [];

      if (transfers.length === 0) {
        // No history — show origin with current owner
        provenanceEvents.push({
          date: l?.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          event: 'Plant registered',
          from: null,
          to: l?.seller?.display_name || 'Current Owner',
          price: null,
          type: 'origin',
        });
        provenanceEvents.push({
          date: new Date().toISOString().slice(0, 10),
          event: 'Current ownership',
          from: null,
          to: l?.seller?.display_name || 'Current Owner',
          price: null,
          type: 'current',
        });
      } else {
        transfers.forEach((tr: Transfer, i: number) => {
          const fromUser = tr.from_user_id ? USERS.find(u => u.id === tr.from_user_id) : null;
          const toUser = tr.to_user_id ? USERS.find(u => u.id === tr.to_user_id) : null;

          if (i === 0 && !tr.from_user_id) {
            provenanceEvents.push({
              date: tr.transferred_at.slice(0, 10),
              event: 'Plant registered',
              from: null,
              to: toUser?.display_name || 'Unknown',
              price: null,
              type: 'origin',
            });
          } else {
            provenanceEvents.push({
              date: tr.transferred_at.slice(0, 10),
              event: tr.sale_price_thb ? 'Sale' : 'Transfer',
              from: fromUser?.display_name || 'Unknown',
              to: toUser?.display_name || 'Unknown',
              price: tr.sale_price_thb || null,
              type: 'sale',
            });
          }
        });

        // Current ownership = last transfer's recipient
        const last = transfers[transfers.length - 1];
        const lastOwner = last.to_user_id ? USERS.find(u => u.id === last.to_user_id) : null;
        provenanceEvents.push({
          date: new Date().toISOString().slice(0, 10),
          event: 'Current ownership',
          from: lastOwner?.display_name || 'Unknown',
          to: lastOwner?.display_name || 'Unknown',
          price: null,
          type: 'current',
        });
      }

      setEvents(provenanceEvents);

      // Mock dispute history only for demo plants that have it
      if (plantId === 'p-sold-1') {
        setDisputes([{ date: '2024-04-10', type: 'resolved', description: 'Transit damage claim — resolved for seller' }]);
      }
    });
  }, [plantId]);

  const priceData = getPriceSnapshotsForSpecies(speciesId, undefined, 90);
  const totalSalesValue = events.reduce((sum, e) => sum + (e.price || 0), 0);
  const totalOwners = new Set(events.map(e => e.to).filter(Boolean)).size || 1;
  const originDate = events[0]?.date || (listing?.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10));

  const coverImage = listing?.photos?.[0]?.storage_path || PLANT_IMAGES[speciesId] || '/images/plants/monstera-thai.jpg';

  if (loading) {
    return (
      <div className="pt-24 pb-16 px-4 text-center">
        <p className="text-zinc-500">Loading provenance…</p>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link to="/browse" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        {/* Plant Identity */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-32 h-32 rounded-xl overflow-hidden bg-zinc-800 shrink-0">
              <img src={coverImage} alt={species?.scientific_name || 'Plant photo'} loading="lazy" decoding="async" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <QrCode className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-purple-400 font-medium">VERIFIED PROVENANCE</span>
              </div>
              <h1 className="text-2xl font-light tracking-tight mb-1">{species?.scientific_name || 'Unknown Plant'}</h1>
              <p className="text-zinc-400 mb-3">{species?.common_name_en || listing?.species?.common_name_en || ''}</p>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="flex items-center gap-1 text-zinc-500"><Calendar className="w-3.5 h-3.5" /> Since {originDate}</span>
                <span className="flex items-center gap-1 text-zinc-500"><User className="w-3.5 h-3.5" /> {totalOwners} owner{totalOwners > 1 ? 's' : ''}</span>
                {totalSalesValue > 0 && (
                  <span className="flex items-center gap-1 text-zinc-500"><Tag className="w-3.5 h-3.5" /> {totalSalesValue.toLocaleString()} THB total sales</span>
                )}
              </div>
            </div>
            <div className="sm:text-right">
              <div className="w-24 h-24 bg-white rounded-xl p-2">
                {qrUrl ? (
                  <img src={qrUrl} alt="QR" loading="lazy" decoding="async" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full bg-zinc-900 rounded-lg flex items-center justify-center">
                    <QrCode className="w-12 h-12 text-white" />
                  </div>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-2 text-center">Scan to verify</p>
            </div>
          </div>
        </div>

        {/* Provenance Chain */}
        <div className="mb-10">
          <h2 className="text-lg font-medium mb-4">Provenance Chain</h2>
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-white/10" />
            <div className="space-y-6">
              {events.map((entry, i) => (
                <div key={i} className="relative pl-16">
                  <div className={`absolute left-4 w-4 h-4 rounded-full border-2 ${entry.type === 'origin' ? 'bg-emerald-500 border-emerald-500' : entry.type === 'current' ? 'bg-purple-500 border-purple-500' : 'bg-white border-white'}`} />
                  <div className="bg-zinc-900/30 border border-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-500">{entry.date}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${entry.type === 'origin' ? 'bg-emerald-500/10 text-emerald-400' : entry.type === 'current' ? 'bg-purple-500/10 text-purple-400' : 'bg-white/5 text-zinc-400'}`}>
                        {entry.type}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{entry.event}</p>
                    {entry.from && <p className="text-xs text-zinc-500">From: {entry.from}</p>}
                    {entry.to && <p className="text-xs text-zinc-500">To: {entry.to}</p>}
                    {entry.price && <p className="text-sm text-emerald-400 mt-1">{entry.price.toLocaleString()} THB</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Individual Price History */}
        {priceData.length > 0 && (
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-medium mb-4">This Plant's Price History</h2>
            <PriceChart data={priceData.map(d => ({ date: d.snapshot_date, price: d.median_price_thb }))} height={250} showArea={true} />
            <p className="text-xs text-zinc-600 mt-3">Individual plant price history overlaid against species average</p>
          </div>
        )}

        {/* Dispute History */}
        {disputes.length > 0 && (
          <div className="bg-zinc-900/30 border border-amber-500/10 rounded-xl p-6">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Incident History
            </h2>
            {disputes.map((d, i) => (
              <div key={i} className="text-sm">
                <span className="text-zinc-500">{d.date} — </span>
                <span className="text-amber-400">{d.type}</span>
                <span className="text-zinc-400"> — {d.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
