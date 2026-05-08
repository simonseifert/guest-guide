/**
 * Property configuration — edit this file to customize the guide for your own
 * cabin / villa / apartment. This is the single source of truth for everything
 * the template renders. After editing, run `npm run dev` to preview.
 */

export type Lang = 'hr' | 'en' | 'de' | 'it';

export const PROPERTY = {
  /* ---------- Brand ---------- */
  brand: {
    /** Property name as it appears in the header and meta tags. */
    name: 'Your Cabin',
    /** Short version shown in the manifest and sticky header. */
    shortName: 'Your Cabin',
    /** Path to your wordmark / logo SVG (white-on-dark recommended for the hero). */
    logoSrc: '/cabin-logo.svg',
    /** A short tagline used in <meta description> when none is set. */
    tagline: 'Guest guide',
  },

  /* ---------- Address & legal ---------- */
  address: {
    line1: '123 Forest Road',
    city: 'Your City',
    postcode: '00000',
    country: 'Your Country',
  },
  /** Croatian tax ID (or local equivalent). Set to `null` to hide the row. */
  oib: null as string | null,
  /** Public website (optional, shown in footer). */
  website: 'https://example.com',

  /* ---------- People ---------- */
  hosts: [
    {
      role: 'host', // 'host' | 'helper' | 'manager' | …
      name: 'Your Name',
      /** E.164 format. Renders as a tel: link. */
      phone: '+1 555 0100',
    },
    /** Optional second contact (e.g. local helper / cleaner). Remove if not needed. */
    {
      role: 'helper',
      name: 'Your Helper',
      phone: '+1 555 0101',
    },
  ],

  /* ---------- Wi-Fi ---------- */
  wifi: {
    ssid: 'YourCabinWiFi',
    password: 'replace-me-please',
    /** WPA | WEP | nopass — most home Wi-Fi is WPA(2). */
    encryption: 'WPA' as 'WPA' | 'WEP' | 'nopass',
  },

  /* ---------- Hero ---------- */
  hero: {
    /** Path to a wide cinematic photo of your property. ~1920×1280 ideal. */
    photoSrc: '/images/hero-twilight.jpg',
    /** Alt text describing the photo (for screen readers). */
    photoAlt: 'A cabin at twilight',
  },

  /* ---------- Map ---------- */
  map: {
    /** Embed URL for an interactive map (e.g. Google My Maps embed). */
    embedUrl: 'https://www.google.com/maps?q=Hlevci+Croatia&output=embed',
    /** Public share URL. Used by the "Open in Maps" button. */
    shareUrl: 'https://www.google.com/maps?q=Hlevci+Croatia',
    /** Short address shown next to the open-in-maps link. */
    placeLabel: 'Your address · Your area',
  },

  /* ---------- i18n ---------- */
  /** Languages this build will produce. Drop any you don't need. */
  languages: ['hr', 'en', 'de', 'it'] as Lang[],
  /** First-visit fallback language when the browser's preference doesn't match. */
  defaultLanguage: 'hr' as Lang,

  /* ---------- Site policy ---------- */
  /** Set to `false` once your site is ready for search engines. */
  noindex: true,

  /* ---------- Vercel deploy ---------- */
  /** Site URL used by Astro for canonical links + OG/Twitter previews. */
  siteUrl: 'https://your-cabin.example.com',
} as const;

export type PropertyConfig = typeof PROPERTY;
