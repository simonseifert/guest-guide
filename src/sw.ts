/// <reference lib="webworker" />
/*
 * Hand-written service worker (vite-pwa `injectManifest`), so route order is ours.
 *
 * Pages are network-first: a guest with any signal always sees the current guide.
 * With no signal (or a reply slower than 3 s) the page comes from the runtime cache,
 * and a page the guest never opened still comes from the precache, so the whole
 * guide keeps working offline.
 *
 * Before this, every URL was precached and the precache route answered first, so
 * a returning guest saw the old page until the worker updated and reloaded.
 */
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { clientsClaim } from 'workbox-core';
import { PROPERTY } from './config/property';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Same as the old generateSW setup: take over open tabs right away so
// registerType 'autoUpdate' reloads them onto the new build.
self.skipWaiting();
clientsClaim();

const pages = new NetworkFirst({
  cacheName: 'pages',
  networkTimeoutSeconds: 3,
  plugins: [
    new CacheableResponsePlugin({ statuses: [200] }),
    new ExpirationPlugin({ maxEntries: 60 }),
  ],
});

// Vercel serves /en/sauna (cleanUrls) while the manifest holds en/sauna/index.html,
// so the offline fallback tries both forms before the default-language home page.
async function fromPrecache(url: string): Promise<Response | undefined> {
  const path = new URL(url).pathname.replace(/\/+$/, '');
  const home = `/${PROPERTY.defaultLanguage}`;
  for (const candidate of [path, `${path}/index.html`, home, `${home}/index.html`]) {
    if (!candidate) continue;
    const hit = await matchPrecache(candidate);
    if (hit) return hit;
  }
  return undefined;
}

// Registered before precacheAndRoute so it wins for every navigation.
registerRoute(
  new NavigationRoute(
    async (options) => {
      try {
        const res = await pages.handle(options);
        if (res) return res;
      } catch {
        // Offline and not in the runtime cache: fall through to the precache.
      }
      return (await fromPrecache(options.request.url)) ?? Response.error();
    },
    { denylist: [/^\/(_|api)/] },
  ),
);

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(
  // Google Fonts CSS: refresh occasionally
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
);

registerRoute(
  // Google Fonts files: long cache, immutable
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
);

registerRoute(
  // Google Maps embed (won't really work offline, but cache the iframe shell)
  ({ url }) => url.origin === 'https://www.google.com' && url.pathname.startsWith('/maps/'),
  new NetworkFirst({
    cacheName: 'google-maps',
    networkTimeoutSeconds: 4,
    plugins: [new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 7 })],
  }),
);
