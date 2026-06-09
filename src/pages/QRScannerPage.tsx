import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, QrCode, Camera, Upload, Keyboard } from 'lucide-react';
import { toast } from 'sonner';

let Html5QrcodeConstructor: typeof import('html5-qrcode').Html5Qrcode | null = null;

async function getHtml5Qrcode() {
  if (!Html5QrcodeConstructor) {
    const mod = await import('html5-qrcode');
    Html5QrcodeConstructor = mod.Html5Qrcode;
  }
  return Html5QrcodeConstructor;
}

export default function QRScannerPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [manualId, setManualId] = useState('');
  const scannerRef = useRef<InstanceType<typeof import('html5-qrcode').Html5Qrcode> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
    } catch {
      // Already stopped or not started
    }
    // scanning state removed
  }, []);

  useEffect(() => {
    if (mode !== 'camera') {
      stopScanner();
      return;
    }

    let cancelled = false;

    async function start() {
      try {
        const Html5Qrcode = await getHtml5Qrcode();
        if (cancelled) return;

        // Ensure DOM element exists
        const el = document.getElementById('qr-reader');
        if (!el) return;

        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;
        // scanner started

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            handleDecoded(decodedText);
          },
          () => {}
        );
      } catch {
        if (!cancelled && mountedRef.current) {
          toast.error('Could not access camera. Try upload mode instead.');
          setMode('upload');
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [mode, stopScanner]);

  const handleDecoded = (text: string) => {
    // Extract plant ID from URL like ".../#/p/plant-123" or just "plant-123"
    const match = text.match(/p-[^/?#]+/);
    const plantId = match ? match[0] : text.trim();
    if (plantId.startsWith('p-')) {
      stopScanner();
      navigate(`/p/${plantId}`);
    } else {
      toast.error('Not a valid Root provenance QR');
    }
  };

  const handleFile = async (file: File) => {
    try {
      const Html5Qrcode = await getHtml5Qrcode();
      const scanner = new Html5Qrcode('qr-reader-file');
      const result = await scanner.scanFile(file, true);
      handleDecoded(result);
    } catch {
      toast.error('Could not read QR from image. Try manual entry.');
    }
  };

  const switchMode = (newMode: typeof mode) => {
    if (mode === newMode) return;
    setMode(newMode);
  };

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 min-h-screen">
      <div className="max-w-md mx-auto">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-light tracking-tight mb-2">Scan Plant QR</h1>
          <p className="text-sm text-zinc-500">
            Verify a plant's provenance by scanning its Root QR tag
          </p>
        </div>

        {/* Mode switcher */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'camera' as const, label: 'Camera', icon: Camera },
            { id: 'upload' as const, label: 'Upload', icon: Upload },
            { id: 'manual' as const, label: 'Type ID', icon: Keyboard },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => switchMode(m.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm transition-colors ${
                mode === m.id
                  ? 'border-emerald-500 bg-emerald-500/5 text-emerald-400'
                  : 'border-white/10 text-zinc-500 hover:border-white/20'
              }`}
            >
              <m.icon className="w-4 h-4" />
              {m.label}
            </button>
          ))}
        </div>

        {mode === 'camera' && (
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden">
            <div id="qr-reader" className="w-full aspect-square" />
            <p className="text-xs text-zinc-500 text-center py-3">Point camera at the QR tag on the plant pot</p>
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
              Choose QR photo
            </button>
            <p className="text-xs text-zinc-600 mt-3">Upload a photo of the QR tag</p>
          </div>
        )}

        {mode === 'manual' && (
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6">
            <label className="text-sm text-zinc-400 mb-1.5 block">Plant ID</label>
            <input
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="e.g. p-123 or plant-abc"
              className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 mb-3"
            />
            <button
              onClick={() => {
                const id = manualId.trim();
                if (id.startsWith('p-')) navigate(`/p/${id}`);
                else toast.error('Enter a valid plant ID starting with p-');
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-medium py-2.5 rounded-lg text-sm"
            >
              Look Up Plant
            </button>
          </div>
        )}

        {/* What is this? */}
        <div className="mt-8 bg-zinc-900/20 border border-white/5 rounded-xl p-4">
          <h3 className="text-sm font-medium mb-2">What is a Root QR tag?</h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Every plant sold on Root gets a unique QR code. Scan it to instantly verify
            the plant's identity, see its full ownership history, and confirm it came from
            a trusted seller. It's like a digital birth certificate for your plant.
          </p>
        </div>
      </div>
    </div>
  );
}
