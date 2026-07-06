import { Leaf, TrendingUp, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import type { IdentificationResult } from '@/types';

interface Props {
  result: IdentificationResult;
}

export function IdentificationResultCard({ result }: Props) {
  const confidencePct = Math.round(result.confidence * 100);
  const confidenceColor = confidencePct >= 80 ? 'text-emerald-400' : confidencePct >= 60 ? 'text-amber-400' : 'text-red-400';
  const estimate = result.market_estimate;

  return (
    <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-light">{result.scientific_name}</h2>
          {result.common_names.length > 0 && (
            <p className="text-zinc-400">{result.common_names.join(' • ')}</p>
          )}
        </div>
        <div className="text-right">
          <p className={`text-3xl font-light ${confidenceColor}`}>{confidencePct}%</p>
          <p className="text-xs text-zinc-500">confidence</p>
        </div>
      </div>

      {result.detected_characteristics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {result.detected_characteristics.map((c, i) => (
            <span key={i} className="text-xs bg-white/5 text-zinc-300 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Leaf className="w-3 h-3 text-emerald-400" /> {c}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        {result.native_region && <div className="bg-zinc-900/50 rounded-lg p-3"><p className="text-xs text-zinc-500">Native region</p><p>{result.native_region}</p></div>}
        {result.growth_habit && <div className="bg-zinc-900/50 rounded-lg p-3"><p className="text-xs text-zinc-500">Growth habit</p><p>{result.growth_habit}</p></div>}
        {result.mature_size && <div className="bg-zinc-900/50 rounded-lg p-3"><p className="text-xs text-zinc-500">Mature size</p><p>{result.mature_size}</p></div>}
        {result.difficulty && <div className="bg-zinc-900/50 rounded-lg p-3"><p className="text-xs text-zinc-500">Difficulty</p><p>{result.difficulty}</p></div>}
      </div>

      {result.reasoning && (
        <div>
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-400" /> Reasoning</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">{result.reasoning}</p>
        </div>
      )}

      {estimate && (
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> Market estimate</h3>
          {estimate.data_sufficient ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><p className="text-xs text-zinc-500">Average</p><p>{estimate.avg_asking_price?.toLocaleString()} THB</p></div>
              <div><p className="text-xs text-zinc-500">Median</p><p>{estimate.median_price?.toLocaleString()} THB</p></div>
              <div><p className="text-xs text-zinc-500">Range</p><p>{estimate.lowest_active?.toLocaleString()} – {estimate.highest_active?.toLocaleString()}</p></div>
              <div><p className="text-xs text-zinc-500">Suggested</p><p>{estimate.suggested_range_low?.toLocaleString()} – {estimate.suggested_range_high?.toLocaleString()}</p></div>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-sm text-zinc-400">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p>Not enough marketplace data for this species yet. {estimate.suggested_range_low && estimate.suggested_range_high ? `Catalogue range: ${estimate.suggested_range_low.toLocaleString()} – ${estimate.suggested_range_high.toLocaleString()} THB.` : ''}</p>
            </div>
          )}
        </div>
      )}

      {result.known_aliases.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-1">Known aliases</h3>
          <p className="text-sm text-zinc-400">{result.known_aliases.join(', ')}</p>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <CheckCircle className="w-3.5 h-3.5" />
        <span>Processed by {result.provider || 'ensemble'} in {result.processing_time_ms}ms</span>
      </div>
    </div>
  );
}
