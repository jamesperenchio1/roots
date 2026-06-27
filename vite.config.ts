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
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-recharts': ['recharts'],
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-select',
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-popover',
            '@radix-ui/react-slider',
            '@radix-ui/react-switch',
            '@radix-ui/react-tooltip',
          ],
        },
      },
    },
  },
}});
