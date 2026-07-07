import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Leaf, Camera, Upload, MapPin, ChevronRight, ChevronLeft, Loader2, RotateCcw,
  Store, ScanSearch
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { MediaUploader } from '@/components/identification/MediaUploader';
import { IdentificationResultCard } from '@/components/identification/IdentificationResultCard';
import type { EvidenceType, UploadedMedia, IdentificationResult } from '@/types';
import type { IdentificationEvidence, EvidenceNeed } from '@/lib/identification/types';
import { evidenceTypeLabel } from '@/lib/identification';
import {
  createIdentificationRequest,
  getIdentificationRequest,
  getRequestMedia,
  runIdentification,
  saveIdentificationResult,
  updateRequestStatus,
  getLatestResult,
} from '@/lib/identification/api-identification';
import { toast } from 'sonner';

const EVIDENCE_FLOW: EvidenceType[] = [
  'overall',
  'alternate_angle',
  'leaf',
  'leaf_underside',
  'stem',
  'node',
  'petiole',
  'roots',
  'flower',
  'fruit',
  'variegation',
  'pot',
];

export default function IdentifyPage() {
  const { t } = useTranslation(['common', 'marketplace']);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const returnTo = searchParams.get('returnTo') || '/browse';

  const [requestId, setRequestId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [evidence, setEvidence] = useState<IdentificationEvidence[]>([]);
  const [result, setResult] = useState<IdentificationResult | null>(null);
  const [needsMore, setNeedsMore] = useState<EvidenceNeed | null>(null);
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState('Thailand');
  const [growingConditions, setGrowingConditions] = useState('');
  const [notes, setNotes] = useState('');
  const initialized = useRef(false);

  const loadRequest = useCallback(async (id: string) => {
    const req = await getIdentificationRequest(id);
    if (!req) {
      toast.error('Identification request not found');
      return;
    }
    setRequestId(req.id);
    setCountry(req.country || 'Thailand');
    setGrowingConditions(req.growing_conditions || '');
    setNotes(req.notes || '');
    const media = await getRequestMedia(req.id);
    setEvidence(media.map((m) => ({ type: m.evidence_type || 'overall', media: m })));
    if (req.status === 'completed') {
      const latest = await getLatestResult(req.id);
      if (latest) setResult(latest);
      setCurrentStepIndex(EVIDENCE_FLOW.length + 2);
    }
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const id = searchParams.get('id');
    if (id) {
      loadRequest(id);
    } else {
      createIdentificationRequest({ userId: user?.id, country }).then((req) => {
        setRequestId(req.id);
      }).catch((err) => toast.error(err.message));
    }
  }, [searchParams, user?.id, country, loadRequest]);

  const handleMediaUploaded = useCallback((media: UploadedMedia, type: EvidenceType) => {
    setEvidence((prev) => {
      const next = prev.filter((e) => e.media.id !== media.id);
      next.push({ type, media });
      return next;
    });
  }, []);

  const run = async () => {
    if (!requestId) return;
    setLoading(true);
    try {
      const { result: combined, needsMore: need } = await runIdentification(requestId, evidence);
      setNeedsMore(need);
      if (!need || combined.confidence >= 0.85) {
        const saved = await saveIdentificationResult(requestId, combined);
        setResult(saved);
        await updateRequestStatus(requestId, 'completed');
        setCurrentStepIndex(EVIDENCE_FLOW.length + 2);
      } else {
        await updateRequestStatus(requestId, 'needs_evidence', need);
        toast.info(`${need.reason} Please upload ${evidenceTypeLabel(need.type)}.`);
        const idx = EVIDENCE_FLOW.indexOf(need.type);
        if (idx >= 0) setCurrentStepIndex(idx);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Identification failed');
    } finally {
      setLoading(false);
    }
  };

  const currentType = EVIDENCE_FLOW[currentStepIndex];
  const isContextStep = currentStepIndex === EVIDENCE_FLOW.length;
  const isProcessingStep = currentStepIndex === EVIDENCE_FLOW.length + 1;
  const isResultStep = currentStepIndex === EVIDENCE_FLOW.length + 2;

  const evidenceForStep = evidence.filter((e) => e.type === currentType);

  const next = () => {
    if (isResultStep) return;
    if (isContextStep) {
      setCurrentStepIndex(EVIDENCE_FLOW.length + 1);
      run();
      return;
    }
    setCurrentStepIndex((i) => Math.min(i + 1, EVIDENCE_FLOW.length));
  };

  const back = () => {
    setCurrentStepIndex((i) => Math.max(0, i - 1));
  };

  const finish = () => {
    if (result?.detected_species_id) {
      navigate(`/seller-dashboard/listings/new?identificationId=${requestId}&speciesId=${encodeURIComponent(result.detected_species_id)}`);
    } else {
      navigate(returnTo);
    }
  };

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-light tracking-tight mb-2 flex items-center gap-3">
            <ScanSearch className="w-8 h-8 text-emerald-400" />
            {t('marketplace:identify.title', { defaultValue: 'Identify a plant' })}
          </h1>
          <p className="text-zinc-500">{t('marketplace:identify.subtitle', { defaultValue: 'Upload evidence and get a free, market-aware identification.' })}</p>
        </div>

        {!isResultStep && (
          <div className="mb-8">
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${((currentStepIndex + 1) / (EVIDENCE_FLOW.length + 2)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {isResultStep && result ? (
          <div className="space-y-6">
            <IdentificationResultCard result={result} />
            <div className="flex flex-col sm:flex-row gap-3">
              {user && (
                <Button onClick={finish} className="bg-emerald-500 hover:bg-emerald-600 text-black">
                  <Store className="w-4 h-4 mr-2" />
                  {t('marketplace:identify.sellThisPlant', { defaultValue: 'Sell this plant' })}
                </Button>
              )}
              <Button variant="outline" onClick={() => { setResult(null); setEvidence([]); setCurrentStepIndex(0); createIdentificationRequest({ userId: user?.id, country }).then((req) => setRequestId(req.id)); }}>
                <RotateCcw className="w-4 h-4 mr-2" />
                {t('common:actions.startOver')}
              </Button>
            </div>
          </div>
        ) : isProcessingStep ? (
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-12 text-center">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-medium">{t('marketplace:identify.processing', { defaultValue: 'Identifying your plant…' })}</h2>
            <p className="text-sm text-zinc-500 mt-2">{t('marketplace:identify.processingDescription', { defaultValue: 'Running free vision models and checking marketplace data.' })}</p>
          </div>
        ) : isContextStep ? (
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-medium">{t('marketplace:identify.contextTitle', { defaultValue: 'Growing context' })}</h2>
            <div>
              <label className="text-sm text-zinc-400 block mb-1.5">{t('marketplace:identify.country', { defaultValue: 'Country' })}</label>
              <div className="flex items-center gap-2 bg-black border border-white/10 rounded-lg px-3 py-2.5">
                <MapPin className="w-4 h-4 text-zinc-500" />
                <input value={country} onChange={(e) => setCountry(e.target.value)} className="bg-transparent flex-1 text-sm outline-none" />
              </div>
            </div>
            <div>
              <label className="text-sm text-zinc-400 block mb-1.5">{t('marketplace:identify.growingConditions', { defaultValue: 'Growing conditions' })}</label>
              <textarea
                value={growingConditions}
                onChange={(e) => setGrowingConditions(e.target.value)}
                placeholder="e.g. bright indirect light, 70% humidity"
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none min-h-[80px]"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400 block mb-1.5">{t('marketplace:identify.notes', { defaultValue: 'Additional notes' })}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything else that might help identification"
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none min-h-[80px]"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={back} className="border-white/10"><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
              <Button onClick={next} disabled={loading || !requestId} className="bg-emerald-500 hover:bg-emerald-600 text-black">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Identify</span> <ChevronRight className="w-4 h-4 ml-1" /></>}
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                {currentType === 'overall' ? <Camera className="w-5 h-5 text-emerald-400" /> : <Leaf className="w-5 h-5 text-emerald-400" />}
              </div>
              <div>
                <h2 className="text-lg font-medium">{evidenceTypeLabel(currentType)}</h2>
                <p className="text-sm text-zinc-500">
                  {currentType === 'overall' && 'Show the whole plant in one frame.'}
                  {currentType === 'leaf' && 'A clear, well-lit leaf close-up is very helpful.'}
                  {currentType === 'stem' && 'Stem texture and colour help distinguish species.'}
                  {currentType === 'flower' && 'Flowers are often the most definitive feature.'}
                  {!['overall', 'leaf', 'stem', 'flower'].includes(currentType) && 'Optional but improves confidence.'}
                </p>
              </div>
            </div>

            {needsMore?.type === currentType && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm text-amber-200 flex items-start gap-2">
                <span className="mt-0.5">⚠️</span>
                <span>{needsMore.reason}</span>
              </div>
            )}

            <MediaUploader
              requestId={requestId || ''}
              evidenceType={currentType}
              label={`Upload ${evidenceTypeLabel(currentType).toLowerCase()}`}
              onMediaUploaded={(media) => handleMediaUploaded(media, currentType)}
              uploadedCount={evidenceForStep.length}
            />

            {evidenceForStep.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {evidenceForStep.map((e) => (
                  <div key={e.media.id} className="aspect-square rounded-lg overflow-hidden bg-zinc-800 border border-white/5">
                    {e.media.media_type === 'image' ? (
                      <img src={e.media.thumbnail_url || e.media.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Upload className="w-6 h-6 text-zinc-500" /></div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={back} disabled={currentStepIndex === 0} className="border-white/10"><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
              <Button onClick={next} variant="outline" className="border-white/10 ml-auto">
                {currentType === 'pot' ? 'Continue' : 'Skip'} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
