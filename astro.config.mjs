import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeImageSize from './src/lib/rehype-image-size.mjs';
import AstroPWA from '@vite-pwa/astro';
import { unified } from '@astrojs/markdown-remark';
import { PROPERTY } from './src/config/property';
import { remarkAffiliates } from './src/lib/remark-affiliates.mjs';

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
    // Astro 7 renders Markdown with Satteri by default. These are remark/rehype
    // plugins, so keep the unified pipeline.
    processor: unified(),
    remarkPlugins: [
      [remarkAffiliates, { affiliates: PROPERTY.affiliates }],
    ],
    rehypePlugins: [
      rehypeImageSize,
      [
        rehypeExternalLinks,
        {
          target: '_blank',
          rel: ['noopener', 'noreferrer'],
          test: (node) => {
            const href = node.properties?.href ?? '';
            if (typeof href !== 'string') return false;
            if (!/^https?:\/\//.test(href)) return false;
            // Don't touch affiliate links — the remark-affiliates plugin
            // already set `rel="sponsored noopener"` (Google requirement)
            // and overriding it here would strip `sponsored`.
            const rel = node.properties?.rel;
            const relStr = Array.isArray(rel) ? rel.join(' ') : (rel ?? '');
            if (relStr.includes('sponsored')) return false;
            return true;
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
      // Hand-written worker (src/sw.ts): pages network-first, precache as the
      // offline fallback. generateSW can't do that, because its precache route
      // always answers before any runtimeCaching rule.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        // Precache every static asset that ships with the build, so the entire
        // site loads offline after the first visit. Cabin signal is patchy.
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,webp,woff2,ico,txt,json}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4MB per asset
        // Astro 7 hands the PWA plugin a build config with minify off, which left
        // the worker at 110 kB instead of 32 kB.
        minify: true,
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
