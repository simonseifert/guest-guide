import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import rehypeExternalLinks from 'rehype-external-links';
import AstroPWA from '@vite-pwa/astro';
import { PROPERTY } from './src/config/property';

export default defineConfig({
  site: PROPERTY.siteUrl,
  i18n: {
    defaultLocale: PROPERTY.defaultLanguage,
    locales: [...PROPERTY.languages],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },
  markdown: {
    rehypePlugins: [
      [
        rehypeExternalLinks,
        {
          target: '_blank',
          rel: ['noopener', 'noreferrer'],
          test: (node) => {
            const href = node.properties?.href ?? '';
            if (typeof href !== 'string') return false;
            return /^https?:\/\//.test(href);
          },
        },
      ],
    ],
  },
  integrations: [
    AstroPWA({
      // Service worker auto-updates on next visit. No annoying refresh prompt.
      registerType: 'autoUpdate',
      // Inject the registration script into every page automatically.
      injectRegister: 'inline',
      // We're already noindex; PWA itself is fine to leave reachable.
      manifest: {
        name: `${PROPERTY.brand.name} — ${PROPERTY.brand.tagline}`,
        short_name: PROPERTY.brand.shortName,
        description: `${PROPERTY.brand.tagline} for ${PROPERTY.brand.name}`,
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F1ECE2',
        theme_color: '#1A2A20',
        lang: PROPERTY.defaultLanguage,
        categories: ['lifestyle', 'travel'],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        // Precache every static asset that ships with the build, so the entire
        // site loads offline after the first visit. Cabin signal is patchy.
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,woff2,ico,txt}'],
        // Don't try to precache the runtime-fetched 11MB+ image library —
        // Workbox doesn't ship that, but adding an upper limit is safe.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4MB per asset
        cleanupOutdatedCaches: true,
        navigateFallback: `/${PROPERTY.defaultLanguage}`,
        navigateFallbackDenylist: [/^\/(_|api)/],
        runtimeCaching: [
          {
            // Google Fonts CSS — refresh occasionally
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Google Fonts files — long cache, immutable
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Maps embed (won't really work offline but cache the iframe shell)
            urlPattern: /^https:\/\/www\.google\.com\/maps\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'google-maps',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
