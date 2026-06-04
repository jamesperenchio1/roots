import { useState, useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import { generateQR } from '@/lib/promptpay';
import type { Listing, Species } from '@/types';

interface PrintTagProps {
  listing: Listing;
  species?: Species | null;
  onClose?: () => void;
}

export default function PrintTag({ listing, species, onClose }: PrintTagProps) {
  const [qrUrl, setQrUrl] = useState('');
  const pageUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/#/p/${listing.id}`;

  useEffect(() => {
    generateQR(pageUrl, 120).then(setQrUrl).catch(() => setQrUrl(''));
  }, [pageUrl]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Print Plant Tag</h3>
          {onClose && (
            <button onClick={onClose} className="text-zinc-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tag Preview */}
        <div className="print-tag-preview bg-white text-black rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-20 h-20 shrink-0">
              {qrUrl ? (
                <img src={qrUrl} alt="QR" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full bg-zinc-200 rounded flex items-center justify-center text-xs text-zinc-400">QR</div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{species?.common_name_en || 'Plant'}</p>
              <p className="text-[10px] text-zinc-600 italic truncate">{species?.scientific_name || ''}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{listing.size_category} · {listing.price_thb.toLocaleString()} THB</p>
              <p className="text-[9px] text-zinc-400 mt-1 truncate">Scan for provenance · root.market</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-zinc-500 mb-4">
          Print this on sticker paper or card stock. Cut along the edge and attach to the plant pot.
        </p>

        <button
          onClick={handlePrint}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-medium py-2.5 rounded-lg text-sm flex items-center justify-center gap-2"
        >
          <Printer className="w-4 h-4" />
          Print Tag
        </button>
      </div>

      {/* Print-only styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-tag-preview, .print-tag-preview * { visibility: visible; }
          .print-tag-preview {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 60mm;
            padding: 4mm;
            border: 0.5pt solid #ccc;
            border-radius: 2mm;
          }
        }
      `}</style>
    </div>
  );
}
