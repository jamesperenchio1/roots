import { NextResponse, type NextRequest } from 'next/server';
import { getWeatherForCity } from '@/lib/weather';

// Weather changes slowly; let Next/Vercel cache this route's response so the
// browser never has to make the two sequential cross-origin open-meteo calls
// itself (geocode -> forecast), which was the main cause of the slow widget.
export const revalidate = 1800;

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get('city')?.trim();

  if (!city) {
    return NextResponse.json({ error: 'Missing "city" query parameter' }, { status: 400 });
  }

  const data = await getWeatherForCity(city);

  if (!data) {
    return NextResponse.json({ error: 'Weather unavailable' }, { status: 502 });
  }

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
    },
  });
}
