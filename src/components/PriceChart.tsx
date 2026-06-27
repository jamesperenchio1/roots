import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar
} from 'recharts';
import { getSpeciesPriceStats, getPriceSnapshotsForSpecies } from '@/data/mockData';

interface PricePoint {
  date: string;
  price: number;
  volume?: number;
}

interface PriceChartProps {
  data: PricePoint[];
  height?: number;
  showArea?: boolean;
  showVolume?: boolean;
  color?: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey?: string }>; label?: string }) {
  const { t } = useTranslation(['marketplace', 'common']);
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className={`text-sm font-medium ${p.dataKey === 'volume' ? 'text-zinc-400' : 'text-emerald-400'}`}>
          {p.dataKey === 'volume' ? t('marketplace:chart.volume', { value: p.value }) : t('marketplace:chart.price', { value: Math.round(p.value).toLocaleString(), currency: t('common:currency') })}
        </p>
      ))}
    </div>
  );
}

export function PriceChart({ data, height = 300, showArea = true, showVolume = false, color = '#4ade80' }: PriceChartProps) {
  const { t } = useTranslation('marketplace');
  const [range, setRange] = useState<'30d' | '90d' | '6m' | '1y' | 'all'>('90d');

  const filteredData = (() => {
    const now = new Date();
    const cutoff = new Date();
    switch (range) {
      case '30d': cutoff.setDate(now.getDate() - 30); break;
      case '90d': cutoff.setDate(now.getDate() - 90); break;
      case '6m': cutoff.setMonth(now.getMonth() - 6); break;
      case '1y': cutoff.setFullYear(now.getFullYear() - 1); break;
      default: return data;
    }
    return data.filter(d => new Date(d.date) >= cutoff);
  })();

  const rangeLabels: Record<typeof range, string> = {
    '30d': '30d',
    '90d': '90d',
    '6m': '6m',
    '1y': '1y',
    'all': t('marketplace:chart.all'),
  };

  return (
    <div>
      <div className="flex items-center gap-1 mb-4">
        {(['30d', '90d', '6m', '1y', 'all'] as const).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${range === r ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            {rangeLabels[r]}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        {showVolume ? (
          <ComposedChart data={filteredData}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#666' }} tickFormatter={(v) => v.slice(5)} />
            <YAxis yAxisId="price" tick={{ fontSize: 11, fill: '#666' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <YAxis yAxisId="vol" orientation="right" tick={{ fontSize: 11, fill: '#666' }} />
            <Tooltip content={<CustomTooltip />} />
            <Area yAxisId="price" type="monotone" dataKey="price" stroke={color} fill="url(#priceGradient)" strokeWidth={2} dot={false} />
            <Bar yAxisId="vol" dataKey="volume" fill="rgba(255,255,255,0.08)" />
          </ComposedChart>
        ) : (
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="priceGradient2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#666' }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 11, fill: '#666' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="price" stroke={color} fill={showArea ? 'url(#priceGradient2)' : 'transparent'} strokeWidth={2} dot={false} />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({ data, width = 80, height = 24, color = '#4ade80' }: SparklineProps) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height * 0.8 - height * 0.1}`).join(' ');
  const isUp = data[data.length - 1] > data[0];

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={isUp ? color : '#ef4444'}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StatsPanel({ speciesId }: { speciesId: string }) {
  const { t } = useTranslation(['marketplace', 'common']);
  const stats30 = getSpeciesPriceStats(speciesId, 30);
  const stats90 = getSpeciesPriceStats(speciesId, 90);
  const trendPct = stats30 && stats90
    ? ((stats30.median - stats90.median) / stats90.median * 100)
    : 0;
  const allTimeData = getPriceSnapshotsForSpecies(speciesId, undefined, 180);
  const allPrices = allTimeData.map(d => d.median_price_thb);
  const lowest = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const highest = allPrices.length > 0 ? Math.max(...allPrices) : 0;
  const totalSales = allTimeData.reduce((s, d) => s + d.sale_count, 0);

  const fmtPrice = (n: number) => `${n.toLocaleString()} ${t('common:currency')}`;

  const stats = [
    { label: t('marketplace:stats.median30d'), value: stats30 ? fmtPrice(stats30.median) : t('marketplace:stats.na') },
    { label: t('marketplace:stats.mean90d'), value: stats90 ? fmtPrice(stats90.mean) : t('marketplace:stats.na') },
    { label: t('marketplace:stats.lowest'), value: fmtPrice(lowest) },
    { label: t('marketplace:stats.highest'), value: fmtPrice(highest) },
    { label: t('marketplace:stats.totalSales'), value: `${totalSales}` },
    { label: t('marketplace:stats.trend'), value: `${trendPct >= 0 ? '+' : ''}${trendPct.toFixed(1)}%`, positive: trendPct >= 0 },
    { label: t('marketplace:stats.daysTracked'), value: `${allTimeData.length}` },
    { label: t('marketplace:stats.volatility'), value: allTimeData.length > 1 ? `${(Math.sqrt(allPrices.reduce((s, p) => s + Math.pow(p - (stats30?.mean || 0), 2), 0) / allPrices.length) / (stats30?.mean || 1) * 100).toFixed(0)}%` : t('marketplace:stats.na') },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div key={i} className="bg-zinc-900/30 border border-white/5 rounded-lg p-3">
          <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
          <p className={`text-sm font-medium ${stat.positive ? 'text-emerald-400' : stat.positive === false ? 'text-red-400' : 'text-white'}`}>
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
