import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"
import { VitePWA } from 'vite-plugin-pwa'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const sentryEnabled = Boolean(env.VITE_SENTRY_DSN) && Boolean(env.SENTRY_AUTH_TOKEN);

  return {
    base: './',
    plugins: [
    ...(mode === 'development' ? [inspectAttr()] : []),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        // HashRouter: all client routes live on / with a hash fragment.
        navigateFallbackAllowlist: [/^\/$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/daacilgagkphafpjdcte\.supabase\.co\/storage\/v1\/object\/public\/.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'listing-photos',
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
    ...(sentryEnabled
      ? [
          sentryVitePlugin({
            org: env.SENTRY_ORG,
            project: env.SENTRY_PROJECT,
            authToken: env.SENTRY_AUTH_TOKEN,
            release: { name: env.VITE_APP_VERSION || 'unknown' },
            sourcemaps: { filesToDeleteAfterUpload: ['**/*.map'] },
          }),
        ]
      : []),
  ],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: sentryEnabled,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id || !id.includes('node_modules')) return;
          // React ecosystem
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom') || id.includes('scheduler') || id.includes('cookie') || id.includes('set-cookie-parser')) {
            return 'vendor-react';
          }
          if (id.includes('i18next') || id.includes('react-i18next')) return 'vendor-i18n';
          if (id.includes('@radix-ui')) return 'vendor-radix';
          if (id.includes('@sentry')) return 'vendor-sentry';
          if (id.includes('recharts')) return 'vendor-recharts';
          if (id.includes('@supabase')) return 'vendor-supabase';
          // Shared UI utilities used by many components
          if (id.includes('tailwind-merge') || id.includes('class-variance-authority') || id.includes('clsx') || id.includes('sonner')) {
            return 'vendor-ui';
          }
        },
      },
    },
  },
}});
