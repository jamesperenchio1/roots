import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, QrCode, Camera, Upload, Keyboard } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const MODES = [
  { id: 'camera', labelKey: 'camera', icon: Camera },
  { id: 'upload', labelKey: 'upload', icon: Upload },
  { id: 'manual', labelKey: 'manual', icon: Keyboard },
];

export default function QRScannerPage() {
  const { t } = useTranslation(['common']);
  const navigate = useNavigate();
  const [mode, setMode] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [scanning, setScanning] = useState(false);
  const [manualId, setManualId] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDecoded = useCallback((text: string) => {
    // Extract plant ID from URL like ".../#/p/plant-123" or just "plant-123"
    const match = text.match(/p-[^/?#]+/);
    const plantId = match ? match[0] : text.trim();
    if (plantId.startsWith('p-')) {
      scannerRef.current?.stop().catch(() => {});
      navigate(`/p/${plantId}`);
    } else {
      toast.error(t('common:qrScanner.errors.invalid'));
    }
  }, [navigate, t]);

  useEffect(() => {
    if (mode === 'camera' && !scanning) {
      setScanning(true);
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            handleDecoded(decodedText);
          },
          () => {}
        )
        .catch(() => {
          toast.error(t('common:qrScanner.errors.camera'));
          setMode('upload');
          setScanning(false);
        });
      return () => {
        scanner.stop().catch(() => {});
        setScanning(false);
      };
    }
  }, [mode, scanning, handleDecoded, t]);

  const handleFile = async (file: File) => {
    try {
      const scanner = new Html5Qrcode('qr-reader-file');
      const result = await scanner.scanFile(file, true);
      handleDecoded(result);
    } catch {
      toast.error(t('common:qrScanner.errors.upload'));
    }
  };

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 min-h-screen">
      <div className="max-w-md mx-auto">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('common:actions.back')}
        </Link>

        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-light tracking-tight mb-2">{t('common:qrScanner.title')}</h1>
          <p className="text-sm text-zinc-500">
            {t('common:qrScanner.subtitle')}
          </p>
        </div>

        {/* Mode switcher */}
        <div className="flex gap-2 mb-6">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id as typeof mode); scannerRef.current?.stop().catch(() => {}); setScanning(false); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm transition-colors ${
                mode === m.id
                  ? 'border-emerald-500 bg-emerald-500/5 text-emerald-400'
                  : 'border-white/10 text-zinc-500 hover:border-white/20'
              }`}
            >
              <m.icon className="w-4 h-4" />
              {t(`common:qrScanner.modes.${m.labelKey}`)}
            </button>
          ))}
        </div>

        {mode === 'camera' && (
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden">
            <div id="qr-reader" className="w-full aspect-square" />
            <p className="text-xs text-zinc-500 text-center py-3">{t('common:qrScanner.cameraHint')}</p>
          </div>
        )}

        {mode === 'upload' && (
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 text-center">
            <div id="qr-reader-file" className="hidden" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-xl px-6 py-4 text-sm text-zinc-300 transition-colors"
            >
              <Upload className="w-5 h-5 mx-auto mb-2 text-zinc-500" />
              {t('common:qrScanner.uploadButton')}
            </button>
            <p className="text-xs text-zinc-600 mt-3">{t('common:qrScanner.uploadHint')}</p>
          </div>
        )}

        {mode === 'manual' && (
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6">
            <label className="text-sm text-zinc-400 mb-1.5 block">{t('common:qrScanner.manualLabel')}</label>
            <input
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder={t('common:qrScanner.manualPlaceholder')}
              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 mb-3"
            />
            <button
              onClick={() => {
                const id = manualId.trim();
                if (id.startsWith('p-')) navigate(`/p/${id}`);
                else toast.error(t('common:qrScanner.errors.manual'));
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-medium py-2.5 rounded-lg text-sm"
            >
              {t('common:qrScanner.lookUp')}
            </button>
          </div>
        )}

        {/* What is this? */}
        <div className="mt-8 bg-zinc-900/20 border border-white/5 rounded-xl p-4">
          <h3 className="text-sm font-medium mb-2">{t('common:qrScanner.whatIs.title')}</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            {t('common:qrScanner.whatIs.description')}
          </p>
        </div>
      </div>
    </div>
  );
}
