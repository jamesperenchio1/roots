import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const config: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'daacilgagkphafpjdcte.supabase.co' },
      { protocol: 'https', hostname: 'api.gbif.org' },
      { protocol: 'https', hostname: 'api.inaturalist.org' },
      { protocol: 'https', hostname: 'static.inaturalist.org' },
      { protocol: 'https', hostname: 'inaturalist-open-data.s3.amazonaws.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
          },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://daacilgagkphafpjdcte.supabase.co https://api.gbif.org https://api.inaturalist.org https://static.inaturalist.org https://inaturalist-open-data.s3.amazonaws.com https://en.wikipedia.org https://*.wikipedia.org https://upload.wikimedia.org https://*.tile.openstreetmap.org",
              "connect-src 'self' https://daacilgagkphafpjdcte.supabase.co wss://daacilgagkphafpjdcte.supabase.co https://perenual.com https://geocoding-api.open-meteo.com https://api.open-meteo.com https://my-api.plantnet.org https://api.gbif.org https://api.inaturalist.org https://en.wikipedia.org https://*.wikipedia.org https://nominatim.openstreetmap.org",
              "font-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              'upgrade-insecure-requests',
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(config, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
