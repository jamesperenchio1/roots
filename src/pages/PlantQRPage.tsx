import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, QrCode, Calendar, User, Tag, AlertTriangle } from 'lucide-react';
import { getProvenanceChain, getSpeciesById, PLANT_IMAGES, USERS } from '@/data/mockData';
import { PriceChart } from '@/components/PriceChart';

export default function PlantQRPage() {
  const { plantId } = useParams<{ plantId: string }>();
  getProvenanceChain(plantId || '');

  // Mock data for demo
  const plantData = {
    id: plantId || 'demo-plant',
    species: getSpeciesById('sp-1'),
    origin_date: '2023-06-15',
    total_owners: 3,
    total_sales_value: 39500,
    status: 'active' as const,
    current_owner: USERS[0],
    provenance: [
      { date: '2023-06-15', event: 'Plant registered', from: null, to: 'Original Grower', price: null, type: 'origin' as const },
      { date: '2023-10-20', event: 'First sale', from: 'Original Grower', to: 'PlantKrit', price: 12000, type: 'sale' as const },
      { date: '2024-03-15', event: 'Resale', from: 'PlantKrit', to: 'GreenHouse_BKK', price: 15500, type: 'sale' as const },
      { date: '2024-06-01', event: 'Current ownership', from: 'GreenHouse_BKK', to: 'RarePlantTH', price: null, type: 'current' as const },
    ],
    dispute_history: [
      { date: '2024-04-10', type: 'resolved' as const, description: 'Transit damage claim — resolved for seller' }
    ]
  };

  const mockPriceData = Array.from({ length: 60 }, (_, i) => ({
    date: new Date(2024, 0, 1 + i).toISOString().split('T')[0],
    price: 12000 + Math.sin(i / 10) * 3000 + (Math.random() - 0.5) * 2000
  }));

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
              <img src={PLANT_IMAGES['sp-1']} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <QrCode className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-purple-400 font-medium">VERIFIED PROVENANCE</span>
              </div>
              <h1 className="text-2xl font-light tracking-tight mb-1">{plantData.species?.scientific_name}</h1>
              <p className="text-zinc-400 mb-3">{plantData.species?.common_name_en}</p>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="flex items-center gap-1 text-zinc-500"><Calendar className="w-3.5 h-3.5" /> Since {plantData.origin_date}</span>
                <span className="flex items-center gap-1 text-zinc-500"><User className="w-3.5 h-3.5" /> {plantData.total_owners} owners</span>
                <span className="flex items-center gap-1 text-zinc-500"><Tag className="w-3.5 h-3.5" /> {plantData.total_sales_value.toLocaleString()} THB total sales</span>
              </div>
            </div>
            <div className="sm:text-right">
              <div className="w-24 h-24 bg-white rounded-xl p-2">
                <div className="w-full h-full bg-zinc-900 rounded-lg flex items-center justify-center">
                  <QrCode className="w-12 h-12 text-white" />
                </div>
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
              {plantData.provenance.map((entry, i) => (
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
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-medium mb-4">This Plant's Price History</h2>
          <PriceChart data={mockPriceData} height={250} showArea={true} />
          <p className="text-xs text-zinc-600 mt-3">Individual plant price history overlaid against species average</p>
        </div>

        {/* Dispute History */}
        {plantData.dispute_history.length > 0 && (
          <div className="bg-zinc-900/30 border border-amber-500/10 rounded-xl p-6">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Incident History
            </h2>
            {plantData.dispute_history.map((d, i) => (
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
