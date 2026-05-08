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
    logoSrc: '/logo.svg',
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
  /** Local tax / business ID (e.g. Croatian OIB, Italian P.IVA). Set to `null` to hide the row. */
  taxId: null as string | null,
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
    photoSrc: '/images/hero-placeholder.svg',
    /** Alt text describing the photo (for screen readers). */
    photoAlt: 'A cabin at twilight',
  },

  /* ---------- Map ---------- */
  map: {
    /** Embed URL for an interactive map (e.g. Google My Maps embed). */
    embedUrl: 'https://www.google.com/maps?q=Eiffel+Tower&output=embed',
    /** Public share URL. Used by the "Open in Maps" button. */
    shareUrl: 'https://www.google.com/maps?q=Eiffel+Tower',
    /** Short address shown next to the open-in-maps link. */
    placeLabel: 'Your address · Your area',
  },

  /* ---------- i18n ---------- */
  /** Languages this build will produce. Drop any you don't need. */
  languages: ['en', 'de', 'hr', 'it'] as Lang[],
  /** First-visit fallback language when the browser's preference doesn't match. */
  defaultLanguage: 'en' as Lang,

  /* ---------- Site policy ---------- */
  /** Set to `false` once your site is ready for search engines. */
  noindex: true,

  /* ---------- Vercel deploy ---------- */
  /** Site URL used by Astro for canonical links + OG/Twitter previews. */
  siteUrl: 'https://your-cabin.example.com',

  /* ---------- Affiliate links (optional) ----------
   * If you have partner accounts with Viator, GetYourGuide, Booking.com or
   * Amazon, set the IDs below. In any markdown file you can then prefix the
   * URL of an ordinary markdown link with `viator:`, `gyg:`, `booking:`, or
   * `amazon:`:
   *
   *     [Skip-the-line tour](viator:https://viator.com/tours/Paris/d479-12345)
   *     [Louvre guided tour](gyg:https://getyourguide.com/paris-l16/abc-12345)
   *     [Hotel near you](booking:https://booking.com/hotel/foo.html)
   *     [Travel adapter](amazon:https://amazon.com/dp/B07XYZ)
   *
   * The build strips the prefix, appends your partner ID to the URL, and
   * adds `target="_blank" rel="sponsored noopener"` (Google requires
   * `sponsored` for paid links). Empty partner ID = the link still works,
   * just no commission. Plain markdown links work as normal.
   */
  affiliates: {
    viator: '',         // Viator partner code (pid)
    getYourGuide: '',   // GetYourGuide partner ID
    booking: '',        // Booking.com aid parameter
    amazon: '',         // Amazon Associates tag
  },

  /* ---------- Analytics (optional) ----------
   * Add a single privacy-friendly analytics provider to learn which sections
   * guests actually open. Set exactly one of the keys below — leave the
   * others as `null`. All three options are GDPR-friendly with no cookie
   * banner required.
   *
   *  - Plausible:   https://plausible.io      (or self-host)
   *  - Umami:       https://umami.is           (or self-host)
   *  - GoatCounter: https://www.goatcounter.com (free for non-commercial)
   *
   * Set to `null` to disable analytics entirely (zero third-party requests).
   */
  analytics: null as
    | null
    | { plausible: { domain: string; src?: string } }
    | { umami: { src: string; websiteId: string } }
    | { goatcounter: { code: string } },
} as const;

export type PropertyConfig = typeof PROPERTY;
