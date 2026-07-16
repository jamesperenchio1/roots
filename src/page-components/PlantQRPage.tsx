'use client'

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import {
  ArrowLeft, QrCode, Calendar, User, Tag, Printer, Download, ShieldAlert,
  ScanLine, History
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PrintTag from '@/components/PrintTag';
import { getSpeciesById, PLANT_IMAGES, USERS } from '@/data/mockData';
import { fetchProvenance, recordQRScan } from '@/lib/api';
import { generateQR } from '@/lib/promptpay';
import ShareButtons from '@/components/ShareButtons';
import { LazyPriceChart } from '@/components/LazyPriceChart';
import { usePriceSnapshots } from '@/hooks/queries/usePriceSnapshots';
import { useAuth } from '@/hooks/useAuth';
import { useClientOrigin } from '@/hooks/useClientOrigin';
import type { Listing, Transfer, Plant } from '@/types';

interface ProvenanceEvent {
  date: string;
  eventKey: string;
  from: string | null;
  to: string | null;
  price: number | null;
  type: 'origin' | 'sale' | 'current';
}

function buildEvents(transfers: Transfer[], plant: Plant | null, listing: Listing | null, t: (k: string) => string): ProvenanceEvent[] {
  const events: ProvenanceEvent[] = [];

  if (transfers.length === 0) {
    const owner = plant?.current_owner?.display_name || listing?.seller?.display_name || t('common:plantQr.currentOwner');
    events.push({
      date: plant?.created_at?.slice(0, 10) || listing?.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      eventKey: 'common:plantQr.events.registered',
      from: null,
      to: owner,
      price: null,
      type: 'origin',
    });
    events.push({
      date: new Date().toISOString().slice(0, 10),
      eventKey: 'common:plantQr.events.currentOwnership',
      from: null,
      to: owner,
      price: null,
      type: 'current',
    });
    return events;
  }

  transfers.forEach((tr, i) => {
    const fromUser = tr.from_user_id ? USERS.find(u => u.id === tr.from_user_id) : null;
    const toUser = tr.to_user_id ? USERS.find(u => u.id === tr.to_user_id) : null;

    if (i === 0 && !tr.from_user_id) {
      events.push({
        date: tr.transferred_at.slice(0, 10),
        eventKey: 'common:plantQr.events.registered',
        from: null,
        to: toUser?.display_name || t('common:plantQr.unknown'),
        price: null,
        type: 'origin',
      });
    } else {
      events.push({
        date: tr.transferred_at.slice(0, 10),
        eventKey: tr.sale_price_thb ? 'common:plantQr.events.sale' : 'common:plantQr.events.transfer',
        from: fromUser?.display_name || t('common:plantQr.unknown'),
        to: toUser?.display_name || t('common:plantQr.unknown'),
        price: tr.sale_price_thb || null,
        type: 'sale',
      });
    }
  });

  const last = transfers[transfers.length - 1];
  const lastOwner = last.to_user_id ? USERS.find(u => u.id === last.to_user_id) : null;
  events.push({
    date: new Date().toISOString().slice(0, 10),
    eventKey: 'common:plantQr.events.currentOwnership',
    from: lastOwner?.display_name || t('common:plantQr.unknown'),
    to: lastOwner?.display_name || t('common:plantQr.unknown'),
    price: null,
    type: 'current',
  });

  return events;
}

export default function PlantQRPage() {
  const { t } = useTranslation(['common']);
  const { plantId } = useParams<{ plantId?: string }>() ?? { plantId: '' };
  const searchParams = useSearchParams();
  const signature = searchParams?.get('s') || '';
  const { user } = useAuth();
  const origin = useClientOrigin();

  const [listing, setListing] = useState<Listing | null>(null);
  const [plant, setPlant] = useState<Plant | null>(null);
  const [events, setEvents] = useState<ProvenanceEvent[]>([]);
  const [scans, setScans] = useState<{ date: string; scanner?: string; source: string }[]>([]);
  const [qrUrl, setQrUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [signatureValid, setSignatureValid] = useState<boolean | null>(null);
  const [showPrintTag, setShowPrintTag] = useState(false);

  const speciesId = plant?.species_id || listing?.species?.id || '';
  const dbSpecies = getSpeciesById(speciesId);
  const species = dbSpecies || plant?.species || listing?.species || null;

  useEffect(() => {
    if (!plantId) return;

    const pageUrl = `${window.location.origin}/p/${plantId}${signature ? `?s=${signature}` : ''}`;
    generateQR(pageUrl, 96).then(setQrUrl).catch(() => setQrUrl(''));

    let active = true;
    const load = async () => {
      const { listing: l, transfers, plant: p, scans: scanRows, signatureValid: valid } = await fetchProvenance(plantId, signature);
      if (!active) return;

      setListing(l);
      setPlant(p);
      setEvents(buildEvents(transfers, p, l, t));
      setScans(scanRows.map(s => ({
        date: s.created_at.slice(0, 10),
        scanner: s.scanner?.display_name,
        source: s.scan_source,
      })));
      setSignatureValid(valid);
      setLoading(false);

      // Record this page view as a scan (best-effort).
      recordQRScan(plantId, 'url', user?.id);
    };

    load();
    return () => { active = false; };
  }, [plantId, signature, user?.id, t]);

  const { data: priceData = [] } = usePriceSnapshots(speciesId || undefined, undefined, 90);
  const totalSalesValue = events.reduce((sum, e) => sum + (e.price || 0), 0);
  const totalOwners = new Set(events.map(e => e.to).filter(Boolean)).size || 1;
  const originDate = events[0]?.date || (listing?.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10));

  const coverImage = listing?.photos?.[0]?.storage_path || PLANT_IMAGES[speciesId] || '/images/plants/monstera-thai.jpg';

  if (loading) {
    return (
      <div className="pt-24 pb-16 px-4 text-center">
        <p className="text-zinc-500">{t('common:plantQr.loading')}</p>
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-md mx-auto text-center">
          <QrCode className="w-14 h-14 text-zinc-600 mx-auto mb-4" />
          <h1 className="text-2xl font-light mb-2">{t('marketplace:provenance.noQrTitle')}</h1>
          <p className="text-zinc-500 mb-6">{t('marketplace:provenance.noQrSubtitle')}</p>
          <div className="flex gap-3 justify-center">
            {listing?.id && (
              <Link href={`/listing/${listing.id}`} className="bg-white text-black px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors">
                {t('marketplace:provenance.backToListing')}
              </Link>
            )}
            <Link href="/browse" className="border border-white/20 px-6 py-2.5 rounded-lg text-sm hover:bg-white/5 transition-colors">
              {t('marketplace:provenance.browsePlants')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/browse" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('common:actions.back')}
        </Link>

        {/* Plant Identity */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-32 h-32 rounded-xl overflow-hidden bg-zinc-800 shrink-0">
              <img src={coverImage} alt={species?.scientific_name || t('common:plantQr.alt.plantPhoto')} loading="lazy" decoding="async" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <QrCode className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-purple-400 font-medium">{t('common:plantQr.verified')}</span>
                {signatureValid === false && (
                  <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> {t('common:plantQr.signatureInvalid')}
                  </span>
                )}
                {signatureValid === true && (
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ScanLine className="w-3 h-3" /> {t('common:plantQr.signatureValid')}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-light tracking-tight mb-1">
                {species?.scientific_name || listing?.species?.scientific_name || t('common:plantQr.unknownPlant')}
              </h1>
              <p className="text-zinc-400 mb-3">
                {species?.common_name_en || species?.common_name_th || listing?.species?.common_name_en || listing?.species?.common_name_th || ''}
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="flex items-center gap-1 text-zinc-500"><Calendar className="w-3.5 h-3.5" /> {t('common:plantQr.since', { date: originDate })}</span>
                <span className="flex items-center gap-1 text-zinc-500"><User className="w-3.5 h-3.5" /> {t('common:plantQr.owners', { count: totalOwners })}</span>
                {totalSalesValue > 0 && (
                  <span className="flex items-center gap-1 text-zinc-500"><Tag className="w-3.5 h-3.5" /> {t('common:plantQr.totalSales', { value: totalSalesValue.toLocaleString(), currency: t('common:currency') })}</span>
                )}
              </div>
            </div>
            <div className="sm:text-right">
              <div className="w-20 h-20 bg-white rounded-xl p-1.5 mx-auto sm:mx-0 sm:ml-auto">
                {qrUrl ? (
                  <img src={qrUrl} alt={t('common:plantQr.alt.qr')} loading="lazy" decoding="async" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full bg-zinc-900 rounded-lg flex items-center justify-center">
                    <QrCode className="w-10 h-10 text-white" />
                  </div>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-2 text-center">{t('common:plantQr.scanToVerify')}</p>
              <div className="mt-2 flex flex-col gap-1.5 items-center sm:items-end">
                {qrUrl && (
                  <a
                    href={qrUrl}
                    download={`root-qr-${plantId}.png`}
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> {t('common:plantQr.downloadQr')}
                  </a>
                )}
                <button
                  onClick={() => setShowPrintTag(true)}
                  className="text-xs text-zinc-500 hover:text-white flex items-center gap-1"
                >
                  <Printer className="w-3 h-3" /> {t('common:plantQr.printTag')}
                </button>
              </div>
              <div className="mt-3 flex justify-center sm:justify-end">
                <ShareButtons
                  title={t('common:plantQr.shareTitle', { name: species?.scientific_name || t('common:plantQr.plant') })}
                  url={`${origin}/p/${plantId}`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Signature warning */}
        {signatureValid === false && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-400">{t('common:plantQr.counterfeitTitle')}</h3>
              <p className="text-xs text-red-300/80 mt-1">{t('common:plantQr.counterfeitDescription')}</p>
            </div>
          </div>
        )}

        {/* What is Provenance? */}
        <div className="mb-10 bg-zinc-900/20 border border-white/5 rounded-xl p-6">
          <h2 className="text-lg font-medium mb-3">{t('common:plantQr.provenance.title')}</h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-3">
            {t('common:plantQr.provenance.description')}
          </p>
          <div className="flex flex-wrap gap-3 mb-4">
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full">{t('common:plantQr.provenance.tags.verifiedOwnership')}</span>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full">{t('common:plantQr.provenance.tags.fraudProtection')}</span>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full">{t('common:plantQr.provenance.tags.careHistory')}</span>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full">{t('common:plantQr.provenance.tags.resaleValue')}</span>
          </div>
          <Link href="/provenance" className="text-sm text-emerald-400 hover:underline">{t('common:plantQr.provenance.link')}</Link>
        </div>

        {/* Provenance Chain */}
        <div className="mb-10">
          <h2 className="text-lg font-medium mb-4">{t('common:plantQr.chain.title')}</h2>
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
                    <p className="text-sm font-medium">{t(entry.eventKey)}</p>
                    {entry.from && <p className="text-xs text-zinc-500">{t('common:plantQr.from', { name: entry.from })}</p>}
                    {entry.to && <p className="text-xs text-zinc-500">{t('common:plantQr.to', { name: entry.to })}</p>}
                    {entry.price && <p className="text-sm text-emerald-400 mt-1">{t('common:plantQr.price', { value: entry.price.toLocaleString(), currency: t('common:currency') })}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scan History */}
        {scans.length > 0 && (
          <div className="mb-10 bg-zinc-900/20 border border-white/5 rounded-xl p-6">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-zinc-400" />
              {t('common:plantQr.scans.title')}
            </h2>
            <div className="space-y-2">
              {scans.slice(0, 5).map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">{s.date}</span>
                  <span className="text-zinc-400 capitalize">{s.source}</span>
                  {s.scanner && <span className="text-zinc-500">{s.scanner}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Individual Price History */}
        {priceData.length > 0 && (
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-8">
            <h2 className="text-lg font-medium mb-4">{t('common:plantQr.priceHistory.title')}</h2>
            <LazyPriceChart data={priceData.map(d => ({ date: d.snapshot_date, price: d.median_price_thb }))} height={250} showArea={true} />
            <p className="text-xs text-zinc-600 mt-3">{t('common:plantQr.priceHistory.note')}</p>
          </div>
        )}


      </div>

      {showPrintTag && listing && (
        <PrintTag
          listing={listing}
          species={species}
          onClose={() => setShowPrintTag(false)}
        />
      )}
    </div>
  );
}
