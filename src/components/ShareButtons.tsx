import { useState } from 'react';
import { Copy, Check, Share2, QrCode, X } from 'lucide-react';
import { toast } from 'sonner';
import { generateQR } from '@/lib/promptpay';

interface ShareButtonsProps {
  title: string;
  url: string;
  description?: string;
}

export default function ShareButtons({ title, url, description }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, url, text: description });
    } catch {
      // user cancelled
    }
  };

  const handleShowQR = async () => {
    if (!qrUrl) {
      try {
        const generated = await generateQR(url, 200);
        setQrUrl(generated);
      } catch {
        toast.error('Failed to generate QR code');
        return;
      }
    }
    setShowQR(true);
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          onClick={handleCopy}
          className="p-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-zinc-400 hover:text-white"
          title="Copy link"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
        {canShare && (
          <button
            onClick={handleNativeShare}
            className="p-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-zinc-400 hover:text-white"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={handleShowQR}
          className="p-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-zinc-400 hover:text-white"
          title="Show QR code"
        >
          <QrCode className="w-4 h-4" />
        </button>
      </div>

      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-xs p-6 text-center">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Share QR Code</h3>
              <button onClick={() => setShowQR(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            {qrUrl ? (
              <div className="bg-white rounded-lg p-3 inline-block">
                <img src={qrUrl} alt="QR Code" className="w-40 h-40" />
              </div>
            ) : (
              <div className="w-40 h-40 bg-zinc-800 rounded-lg flex items-center justify-center mx-auto">
                <QrCode className="w-12 h-12 text-zinc-600" />
              </div>
            )}
            <p className="text-xs text-zinc-500 mt-3 break-all">{url}</p>
          </div>
        </div>
      )}
    </>
  );
}
