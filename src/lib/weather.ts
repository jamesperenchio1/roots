export interface WeatherData {
  temp: number;
  humidity: number;
  uv_index: number;
  is_day: boolean;
  rain_chance: number;
  condition: string;
  forecast: Array<{
    date: string;
    temp_max: number;
    temp_min: number;
    rain_chance: number;
    condition: string;
  }>;
}

interface GeocodingResult {
  results?: Array<{
    id: number;
    name: string;
    latitude: number;
    longitude: number;
  }>;
}

interface OpenMeteoCurrent {
  temperature_2m: number;
  relative_humidity_2m: number;
  is_day: number;
  precipitation: number;
  weather_code: number;
  uv_index: number;
}

interface OpenMeteoDaily {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: number[];
}

interface OpenMeteoResponse {
  current: OpenMeteoCurrent;
  daily: OpenMeteoDaily;
}

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export const PROVINCE_CITIES: Record<string, string> = {
  'Bangkok': 'Bangkok',
  'Chiang Mai': 'Chiang Mai',
  'Chiang Rai': 'Chiang Rai',
  'Phuket': 'Phuket',
  'Pattaya': 'Pattaya',
  'Nonthaburi': 'Nonthaburi',
  'Khon Kaen': 'Khon Kaen',
  'Udon Thani': 'Udon Thani',
  'Nakhon Ratchasima': 'Nakhon Ratchasima',
  'Rayong': 'Rayong',
};

function getCache<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return undefined;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getCityCoords(
  cityName: string
): Promise<{ lat: number; lon: number; name: string } | null> {
  const cacheKey = `geo:${cityName}`;
  const cached = getCache<{ lat: number; lon: number; name: string }>(cacheKey);
  if (cached) return cached;

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
  const data = await fetchJson<GeocodingResult>(url);
  const result = data?.results?.[0];
  if (!result) return null;

  const coords = { lat: result.latitude, lon: result.longitude, name: result.name };
  setCache(cacheKey, coords);
  return coords;
}

export async function getWeather(lat: number, lon: number): Promise<WeatherData | null> {
  const cacheKey = `weather:${lat},${lon}`;
  const cached = getCache<WeatherData>(cacheKey);
  if (cached) return cached;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,is_day,precipitation,weather_code,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FBangkok&forecast_days=3`;
  const data = await fetchJson<OpenMeteoResponse>(url);
  if (!data) return null;

  const current = data.current;
  const daily = data.daily;

  const forecast: WeatherData['forecast'] = [];
  for (let i = 0; i < daily.time.length; i++) {
    forecast.push({
      date: daily.time[i],
      temp_max: daily.temperature_2m_max[i],
      temp_min: daily.temperature_2m_min[i],
      rain_chance: daily.precipitation_probability_max[i],
      condition: weatherCodeToCondition(daily.weather_code[i]),
    });
  }

  const weather: WeatherData = {
    temp: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    uv_index: current.uv_index ?? 0,
    is_day: current.is_day === 1,
    rain_chance: daily.precipitation_probability_max[0] ?? 0,
    condition: weatherCodeToCondition(current.weather_code),
    forecast,
  };

  setCache(cacheKey, weather);
  return weather;
}

export async function getWeatherForCity(cityName: string): Promise<WeatherData | null> {
  const coords = await getCityCoords(cityName);
  if (!coords) return null;
  return getWeather(coords.lat, coords.lon);
}

export function weatherCodeToCondition(code: number): string {
  if (code === 0) return 'Clear';
  if (code >= 1 && code <= 3) return 'Partly cloudy';
  if (code >= 45 && code <= 48) return 'Fog';
  if (code >= 51 && code <= 67) return 'Drizzle / Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

export function getCareTip(weather: WeatherData): string {
  if (weather.temp > 35) return 'Very hot — mist sensitive plants, avoid direct sun';
  if (weather.temp < 20) return 'Cool weather — reduce watering frequency';
  if (weather.condition === 'Thunderstorm' || weather.condition === 'Showers' || weather.condition === 'Drizzle / Rain' || weather.rain_chance > 70) {
    return 'Rainy day — avoid watering, check drainage';
  }
  if (weather.humidity < 40) return 'Dry air — consider humidifier for tropical plants';
  if (weather.uv_index > 8) return 'High UV today — keep new plants in shade';
  return 'Great weather for plants — enjoy your garden!';
}
