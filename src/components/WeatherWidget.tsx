import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CloudRain, Droplets, Sun, Cloud, Wind, Thermometer, Umbrella } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getWeatherForCity, type WeatherData } from '@/lib/weather';

interface WeatherWidgetProps {
  cityName: string;
  compact?: boolean;
}

function getCareTipKey(weather: WeatherData): string {
  if (weather.temp > 35) return 'marketplace:weather.careTip.hot';
  if (weather.temp < 20) return 'marketplace:weather.careTip.cool';
  if (weather.condition === 'Thunderstorm' || weather.condition === 'Showers' || weather.rain_chance > 70) {
    return 'marketplace:weather.careTip.rainy';
  }
  if (weather.humidity < 40) return 'marketplace:weather.careTip.dry';
  if (weather.uv_index > 8) return 'marketplace:weather.careTip.uv';
  return 'marketplace:weather.careTip.great';
}

function conditionKey(condition: string): string {
  const lower = condition.toLowerCase();
  if (lower.includes('clear')) return 'marketplace:weather.condition.clear';
  if (lower.includes('partly cloudy')) return 'marketplace:weather.condition.partlyCloudy';
  if (lower.includes('cloud')) return 'marketplace:weather.condition.cloudy';
  if (lower.includes('drizzle') || lower.includes('rain')) return 'marketplace:weather.condition.rain';
  if (lower.includes('shower')) return 'marketplace:weather.condition.showers';
  if (lower.includes('thunder')) return 'marketplace:weather.condition.thunderstorm';
  if (lower.includes('snow')) return 'marketplace:weather.condition.snow';
  if (lower.includes('fog')) return 'marketplace:weather.condition.fog';
  return 'marketplace:weather.condition.unknown';
}

export default function WeatherWidget({ cityName, compact }: WeatherWidgetProps) {
  const { t, i18n } = useTranslation(['marketplace', 'common']);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);
      try {
        const data = await getWeatherForCity(cityName);
        if (cancelled) return;
        if (data) {
          setWeather(data);
        } else {
          setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [cityName]);

  if (loading) {
    if (compact) {
      return (
        <div className="bg-zinc-900/30 border border-white/5 rounded-xl px-4 py-3 flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      );
    }
    return (
      <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6 space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className={`bg-zinc-900/30 border border-white/5 rounded-xl ${compact ? 'px-4 py-3' : 'p-6'}`}>
        <p className="text-xs text-zinc-500">{t('weather.unavailable', { city: cityName })}</p>
      </div>
    );
  }

  const conditionIcon = getConditionIcon(weather.condition, compact ? 'w-5 h-5' : 'w-8 h-8');
  const careTipKey = getCareTipKey(weather);
  const translatedCondition = t(conditionKey(weather.condition));

  if (compact) {
    return (
      <div className="bg-zinc-900/30 border border-white/5 rounded-xl px-4 py-3 flex items-center gap-3">
        {conditionIcon}
        <div>
          <p className="text-sm font-medium text-white">{Math.round(weather.temp)}°C</p>
          <p className="text-xs text-zinc-500">{translatedCondition} · {weather.humidity}% {t('weather.humidity')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/30 border border-white/5 rounded-xl p-6">
      <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
        <Thermometer className="w-5 h-5 text-emerald-400" />
        {t('weather.title', { city: cityName })}
      </h3>

      <div className="flex items-center gap-4 mb-5">
        {conditionIcon}
        <div>
          <p className="text-2xl font-light text-white">{Math.round(weather.temp)}°C</p>
          <p className="text-sm text-zinc-400">{translatedCondition}</p>
        </div>
        <div className="ml-auto flex gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-1">
            <Droplets className="w-3.5 h-3.5 text-sky-400" />
            {weather.humidity}%
          </div>
          <div className="flex items-center gap-1">
            <Umbrella className="w-3.5 h-3.5 text-purple-400" />
            {weather.rain_chance}%
          </div>
        </div>
      </div>

      {weather.forecast.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {weather.forecast.map((day) => (
            <div key={day.date} className="bg-zinc-900/50 rounded-lg p-3 text-center">
              <p className="text-xs text-zinc-500 mb-1">
                {new Date(day.date).toLocaleDateString(i18n.language, { weekday: 'short' })}
              </p>
              <div className="flex justify-center mb-1">
                {getConditionIcon(day.condition, 'w-5 h-5')}
              </div>
              <p className="text-xs text-zinc-300">
                {Math.round(day.temp_max)}° / {Math.round(day.temp_min)}°
              </p>
              <p className="text-[10px] text-zinc-500">{day.rain_chance}% {t('weather.rain')}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 flex items-start gap-2">
        <SproutIcon className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
        <p className="text-xs text-emerald-300">{t(careTipKey)}</p>
      </div>
    </div>
  );
}

function getConditionIcon(condition: string, className: string) {
  const lower = condition.toLowerCase();
  if (lower.includes('clear')) return <Sun className={`${className} text-amber-400`} />;
  if (lower.includes('cloud')) return <Cloud className={`${className} text-zinc-400`} />;
  if (lower.includes('rain') || lower.includes('drizzle') || lower.includes('shower')) {
    return <CloudRain className={`${className} text-sky-400`} />;
  }
  if (lower.includes('thunder')) return <CloudRain className={`${className} text-purple-400`} />;
  if (lower.includes('snow')) return <Wind className={`${className} text-blue-300`} />;
  if (lower.includes('fog')) return <Wind className={`${className} text-zinc-500`} />;
  return <Sun className={`${className} text-amber-400`} />;
}

function SproutIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 20h10" />
      <path d="M10 20c5.5-2.5.8-6.4 3-10" />
      <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7" />
      <path d="M14.1 6a7 7 0 0 0-1.1 4c0 1.2.3 2.4.8 3.4" />
      <path d="M17 20c0-2.5-1.5-4.5-3.5-5.5" />
    </svg>
  );
}
