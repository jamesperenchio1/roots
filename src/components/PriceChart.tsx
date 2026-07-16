'use client'

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar,
  Brush, ReferenceLine, ReferenceArea
} from 'recharts';

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
  const { t } = useTranslation(['marketplace', 'common']);
  const [range, setRange] = useState<'30d' | '90d' | '6m' | '1y' | 'all'>('90d');
  const [compare, setCompare] = useState<{ start?: string; end?: string }>({});

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

  const handleChartClick = (e: { activeLabel?: string } | null) => {
    const label = e?.activeLabel;
    if (!label) return;
    setCompare(prev => {
      if (!prev.start) return { start: label };
      if (!prev.end) return { ...prev, end: label };
      return { start: label };
    });
  };

  const startPoint = compare.start ? filteredData.find(d => d.date === compare.start) : undefined;
  const endPoint = compare.end ? filteredData.find(d => d.date === compare.end) : undefined;
  const compareStartPrice = startPoint?.price;
  const compareEndPrice = endPoint?.price;
  const compareDiff = compareStartPrice !== undefined && compareEndPrice !== undefined
    ? compareEndPrice - compareStartPrice
    : undefined;
  const comparePct = compareStartPrice !== undefined && compareEndPrice !== undefined && compareStartPrice !== 0
    ? ((compareEndPrice - compareStartPrice) / compareStartPrice) * 100
    : undefined;

  const [areaStart, areaEnd] = compare.start && compare.end
    ? [compare.start, compare.end].sort()
    : [undefined, undefined];

  const fmtPrice = (n: number) => `${Math.round(n).toLocaleString()} ${t('common:currency')}`;

  const yTickFmt = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(1).replace(/\.0$/, '')}k` : `${Math.round(v)}`;

  const prices = filteredData.map(d => d.price);
  const priceMin = prices.length > 0 ? Math.min(...prices) : 0;
  const priceMax = prices.length > 0 ? Math.max(...prices) : 0;
  const yDomain: [number | string, number | string] =
    priceMin === priceMax && prices.length > 0
      ? [Math.max(0, priceMin * 0.8), priceMax * 1.2 || priceMax + 100]
      : ['auto', 'auto'];

  return (
    <div className="relative">
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
      {filteredData.length === 0 ? (
        <div className="flex items-center justify-center text-zinc-500 text-sm border border-white/5 rounded-lg" style={{ height }}>
          {t('marketplace:species.insufficientData')}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {showVolume ? (
            <ComposedChart data={filteredData} onClick={handleChartClick}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#666' }} tickFormatter={(v) => v.slice(5)} />
              <YAxis yAxisId="price" domain={yDomain} tick={{ fontSize: 11, fill: '#666' }} tickFormatter={yTickFmt} />
              <YAxis yAxisId="vol" orientation="right" tick={{ fontSize: 11, fill: '#666' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area yAxisId="price" type="monotone" dataKey="price" stroke={color} fill="url(#priceGradient)" strokeWidth={2} dot={false} />
              <Bar yAxisId="vol" dataKey="volume" fill="rgba(255,255,255,0.08)" />
              {compare.start && <ReferenceLine yAxisId="price" x={compare.start} stroke="#facc15" strokeDasharray="4 4" />}
              {compare.end && <ReferenceLine yAxisId="price" x={compare.end} stroke="#facc15" strokeDasharray="4 4" />}
              {areaStart && areaEnd && <ReferenceArea yAxisId="price" x1={areaStart} x2={areaEnd} stroke="none" fill="#facc15" fillOpacity={0.1} />}
              <Brush dataKey="date" height={30} stroke="#4ade80" travellerWidth={8} />
            </ComposedChart>
          ) : (
            <AreaChart data={filteredData} onClick={handleChartClick}>
              <defs>
                <linearGradient id="priceGradient2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#666' }} tickFormatter={(v) => v.slice(5)} />
              <YAxis domain={yDomain} tick={{ fontSize: 11, fill: '#666' }} tickFormatter={yTickFmt} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="price" stroke={color} fill={showArea ? 'url(#priceGradient2)' : 'transparent'} strokeWidth={2} dot={false} />
              {compare.start && <ReferenceLine x={compare.start} stroke="#facc15" strokeDasharray="4 4" />}
              {compare.end && <ReferenceLine x={compare.end} stroke="#facc15" strokeDasharray="4 4" />}
              {areaStart && areaEnd && <ReferenceArea x1={areaStart} x2={areaEnd} stroke="none" fill="#facc15" fillOpacity={0.1} />}
              <Brush dataKey="date" height={30} stroke="#4ade80" travellerWidth={8} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      )}
      {compareDiff !== undefined && (
        <div className="absolute top-8 right-0 bg-zinc-900/90 border border-white/10 rounded-lg p-3 shadow-xl text-xs z-10 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 mb-2">
            <span className="text-zinc-400">{t('marketplace:chart.compare.title')}</span>
            <button
              onClick={() => setCompare({})}
              className="text-zinc-500 hover:text-white"
            >
              {t('marketplace:chart.compare.reset')}
            </button>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">{t('marketplace:chart.compare.start')}:</span>
              <span className="font-medium">{fmtPrice(compareStartPrice!)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">{t('marketplace:chart.compare.end')}:</span>
              <span className="font-medium">{fmtPrice(compareEndPrice!)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">{t('marketplace:chart.compare.difference')}:</span>
              <span className={`font-medium ${compareDiff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {compareDiff >= 0 ? '+' : ''}{fmtPrice(Math.abs(compareDiff))}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-zinc-500">{t('marketplace:chart.compare.change')}:</span>
              <span className={`font-medium ${comparePct! >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {comparePct! >= 0 ? '+' : ''}{comparePct!.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

