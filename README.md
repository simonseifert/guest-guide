# Guest Guide

A multilingual, offline-capable, brand-customizable **guest information PWA** for vacation rentals — cabins, villas, apartments, anything you let guests stay in.

A free, open-source alternative to **[InfoSpot](https://www.infospot.online/)**, **TouchStay**, and other "guest info" SaaS tools. Built on **Astro 5 + Tailwind 4** — fast, owned by you, no monthly fee. Mobile-first, sub-200kb first load, full offline support after the first visit.

[![Live Demo](https://img.shields.io/badge/%F0%9F%8C%90_Live_Demo-guest--guide.vercel.app-22c55e?style=for-the-badge)](https://guest-guide.vercel.app)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsimonseifert%2Fguest-guide)

---

## Features

- 📱 **Mobile-first** — designed at 390px, scales clean to desktop
- 🌍 **Multilingual** — ships with EN/DE/HR/IT; add any language with one DeepL command
- 🛜 **PWA + offline** — service worker precaches the whole site so guests with patchy signal can still read instructions
- 🪪 **Wi-Fi tap-to-join QR** — guests scan with their camera, phone joins automatically (`WIFI:` URI scheme)
- 🗺️ **Embedded interactive map** for nearby places + open-in-Maps deeplink
- ☎️ **Tap-to-call** emergency + host contact numbers
- 🎨 **Brand-customizable** — single config file (`src/config/property.ts`) controls all property-specific data
- 🔒 **`noindex` by default** — guest info, not search-traffic content
- 🆓 **No SaaS fees** — host it on Vercel / Netlify / Cloudflare Pages free tier
- 🖨️ **Printable A4 poster** — `npm run poster` generates a fridge-ready PNG with Wi-Fi QR + guide QR
- 📰 **Print-friendly stylesheet** — guests can print any section as clean monochrome A4
- 💸 **Affiliate-link helper** — earn commission from Viator / GetYourGuide / Booking / Amazon links with one config field
- 📊 **Privacy-friendly analytics** (optional) — Plausible / Umami / GoatCounter, no cookie banner needed
- 🤖 **AI bootstrapper** — paste a property description (or URL) → first-draft guide in 30 seconds via Claude
- 📍 **Google Places auto-import** — turn a list of place IDs into rich "Places to visit" markdown with photos, ratings, opening hours

## Screenshots

<table>
  <tr valign="top">
    <td align="center" width="33%"><sub><b>Home</b><br/>Wi-Fi QR, house rules, sections grouped by category</sub></td>
    <td align="center" width="33%"><sub><b>Section page</b><br/>Safety callouts, prose styled for readability</sub></td>
    <td align="center" width="33%"><sub><b>Explore the area</b><br/>Embedded map + place lists</sub></td>
  </tr>
  <tr valign="top">
    <td><img src="docs/screenshots/mobile-home.png" alt="Mobile home"/></td>
    <td><img src="docs/screenshots/mobile-section.png" alt="Mobile section page"/></td>
    <td><img src="docs/screenshots/mobile-explore.png" alt="Mobile explore the area"/></td>
  </tr>
</table>

## Why this exists

InfoSpot, TouchStay, and similar tools want £15–£60/month per property for what is, fundamentally, a static webpage with QR codes. This template gives you the same thing in 200 KB of static HTML, deployable for free, owned by you, and customizable down to the last pixel.

| | InfoSpot / TouchStay | Guest Guide |
|---|---|---|
| Monthly cost | £15–£60 / property | $0 |
| Custom domain | Paid tier | Yes |
| Offline support | Limited | Full PWA |
| Multilingual | Paid tier | Yes, 4 languages |
| Custom design | Templates only | Full HTML/CSS control |
| Data ownership | Their servers | Your repo |

## Quick start

```bash
git clone https://github.com/simonseifert/guest-guide.git my-guest-guide
cd my-guest-guide
npm install
npm run dev          # open http://localhost:4321
```

### Or skip the manual edit and let Claude bootstrap it

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run bootstrap
```

The CLI prompts for a property description (or paste a public listing URL) and Claude writes a full first-draft guidebook — `src/config/property.ts` plus 8-10 section markdown files — in about 30 seconds. Costs ~$0.15 in API credits per run. See [AI bootstrap](#ai-bootstrap) below for details.

## Customize for your property — 4 steps

### 1. Edit `src/config/property.ts`

Single source of truth for everything property-specific: name, address, host names + phone numbers, Wi-Fi SSID + password, map URLs, languages.

```ts
export const PROPERTY = {
  brand: { name: 'My Cabin', shortName: 'My Cabin', logoSrc: '/logo.svg', tagline: 'Guest guide' },
  address: { line1: '...', city: '...', postcode: '...', country: '...' },
  taxId: null,            // local tax/business ID — set to null to hide
  hosts: [
    { role: 'host', name: 'Your Name', phone: '+1 555 0100' },
    { role: 'helper', name: 'Local Helper', phone: '+1 555 0101' },
  ],
  wifi: { ssid: 'MyCabinWiFi', password: 'replace-me-please', encryption: 'WPA' },
  hero: { photoSrc: '/images/hero-placeholder.svg', photoAlt: 'A cabin at twilight' },
  map: { embedUrl: '...', shareUrl: '...', placeLabel: 'Address · Area' },
  languages: ['en', 'de', 'hr', 'it'],
  defaultLanguage: 'en',
  noindex: true,
  siteUrl: 'https://your-property.example.com',
  affiliates: { viator: '', getYourGuide: '', booking: '', amazon: '' },  // optional
  analytics: null,                                                         // optional
};
```

### 2. Replace assets in `/public/`

| File | Replace with |
|---|---|
| `logo.svg` | Your wordmark (white-on-transparent, ~612×120 viewBox works best for the dark hero overlay) |
| `images/hero-placeholder.svg` | Your hero photo — JPG/WebP at ~1920×1280 atmospheric. Update `hero.photoSrc` in `property.ts` accordingly. |
| `icon-192.png`, `icon-512.png`, `icon-maskable.png`, `apple-touch-icon.png`, `icon.svg` | Regenerate via `node scripts/generate-icons.mjs` (edit colors at the top of the script first) |
| `favicon.svg` | Your favicon |

### 3. Edit content in `src/content/sections/<lang>/`

Each markdown file is one section page. Frontmatter:

```md
---
title: Section title
icon: 💦                         # emoji shown on the section page header
order: 1                         # sort order within its category
category: indulge                # rules | indulge | tech | stay
summary: One-line description shown on the homepage card.
safetyCritical: true             # adds a safety callout banner
---

Markdown body…
```

The four categories control how sections group on the homepage:

- **`rules`** — featured prominently above the categories (typically house rules)
- **`indulge`** — the fun stuff (jacuzzi, sauna, BBQ, TV)
- **`tech`** — appliances + how-to (coffee, oven, water heater, audio system)
- **`stay`** — practical (check-out, area, emergency contacts)

The starter content is brand-neutral placeholder text. Read it, edit it, replace it. The category labels and homepage section eyebrows live in `src/i18n/ui.ts`.

### 4. Deploy

```bash
npm run build              # → ./dist/
```

Anywhere static-hosted will do. Recommended: **Vercel** — push to GitHub, click "Import" in Vercel dashboard, done. No env vars needed.

## Architecture

```
src/
  config/property.ts                ← edit me first
  content/sections/{en,de,hr,it}/*.md
  components/
    Hero, WifiCard, RulesFeature, AntlerDivider,
    SectionGroup, SectionRow, MapPreview, Icon
  layouts/Layout.astro              ← header + footer + html shell
  pages/
    index.astro                     ← / → language-detected redirect
    [lang]/index.astro              ← /en, /de, /hr, /it (homepages)
    [lang]/[slug].astro             ← per-section pages
  i18n/ui.ts                        ← UI strings + per-language labels
  lib/remark-affiliates.mjs         ← rewrites affiliate links at build time
  styles/global.css                 ← design system tokens + component CSS
  styles/print.css                  ← print stylesheet (single column, hide chrome)
public/
  logo.svg                          ← your wordmark
  favicon.svg, icon-*.png, apple-touch-icon.png
  images/hero-placeholder.svg       ← swap for your hero photo
  manifest.webmanifest              ← (auto-generated at build)
scripts/
  bootstrap.mjs                     ← AI guidebook bootstrapper (Anthropic)
  fetch-places.mjs                  ← Google Places API → places.md
  generate-icons.mjs                ← regenerates PWA icons from a source SVG
  generate-poster.mjs               ← writes dist/poster.png — fridge-ready Wi-Fi + guide QR
  translate.mjs                     ← translate EN markdown into another language
places.config.example.json          ← copy to places.config.json (gitignored) for fetch-places
```

## Stack

- [Astro 5](https://astro.build) (static export)
- [Tailwind 4](https://tailwindcss.com) via the Vite plugin
- TypeScript strict
- [@vite-pwa/astro](https://vite-pwa-org.netlify.app/frameworks/astro.html) for service worker + manifest generation (Workbox under the hood)
- [qrcode](https://github.com/soldair/node-qrcode) for build-time Wi-Fi QR generation
- [rehype-external-links](https://github.com/rehypejs/rehype-external-links) so external markdown links open in new tabs

## AI bootstrap

The fastest way from "blank repo" to "first-draft guidebook" is to let Claude do the typing.

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run bootstrap
```

The CLI offers three input modes:

```bash
# Paste a public listing URL (Booking, Vrbo, your own site)
npm run bootstrap -- --url=https://example.com/listings/cabin

# Pass a description directly
npm run bootstrap -- --description="3-bedroom log cabin in Aspen with hot tub, sauna, fireplace, OFYR grill"

# Or run with no args and the CLI opens an interactive prompt
npm run bootstrap
```

It writes:
- `src/config/property.ts` — name, address, host placeholder, Wi-Fi placeholder, languages
- `src/content/sections/<lang>/*.md` — welcome, rules, checkout, emergency, plus auto-detected amenity sections (jacuzzi, sauna, grill, tv, coffee, oven, water, avr, places, explore)

After it runs, `npm run dev` to preview. Always do a human pass — Claude is good at structure and tone but you need to fill in real Wi-Fi credentials, real local picks, real host phone numbers. Use `--dry-run` to see the plan without writing files.

> The AI runs at **bootstrap time**, not at runtime. After it finishes, the repo is just markdown — no API key, no backend, no third-party calls. The static-PWA story is preserved.

## Auto-import places from Google

If you have a list of nearby attractions, restaurants, and shops, you can populate a rich "Places to visit" section with one command instead of writing each entry by hand.

### 1. Find Place IDs

Use Google's [Place ID Finder](https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder) — search for a place, copy the ID that starts with `ChIJ…`.

### 2. Fill in `places.config.json`

```bash
cp places.config.example.json places.config.json
```

```json
{
  "categories": [
    {
      "name": "Walking distance",
      "icon": "🥾",
      "subhead": "under 15 min",
      "places": [
        { "id": "ChIJN1t_tDeuEmsRUsoyG83frY4" },
        { "id": "ChIJ5mO0wxK0t4kRA-AiFx6_kTk" }
      ]
    },
    {
      "name": "Where to eat",
      "icon": "🍽️",
      "places": [{ "id": "ChIJ..." }]
    }
  ]
}
```

### 3. Run the importer

```bash
GOOGLE_PLACES_API_KEY=xxx npm run fetch-places
```

For each place it pulls name, address, rating, review count, editorial summary, opening hours, and the first photo (saved to `public/places/`). It generates `src/content/sections/<lang>/places.md` for every language in `PROPERTY.languages`. Place data is fetched in each language using Google's `languageCode` parameter — no separate translation pass needed.

API responses are cached in `.places-cache/` for 30 days, so re-runs don't re-bill. Pass `--force` to bust the cache. Pass `--slug attractions` to use a different filename. Pass `--langs en,de` to limit which language files are written.

**Costs:** ~$0.017 per place lookup, $0.007 per photo. Free tier covers most setups (a typical 30-place list costs under $1). See the [Places API pricing](https://developers.google.com/maps/billing-and-pricing/pricing).

## Earn commission from your guide (optional)

If you have a Viator, GetYourGuide, Booking.com, or Amazon Associates partner account, the template can attribute every outbound link to you with a single config edit. Hosts using paid SaaS tools cite affiliate revenue as the #1 reason they upgrade tiers — here it's free.

### 1. Add your partner IDs

```ts
// src/config/property.ts
affiliates: {
  viator: 'YOUR_PID',          // Viator partner code
  getYourGuide: 'YOUR_ID',     // GetYourGuide partner ID
  booking: 'YOUR_AID',         // Booking.com aid parameter
  amazon: 'yourtag-20',        // Amazon Associates tag
},
```

Don't have a partner account? Apply: [Viator](https://www.viator.com/affiliates/) · [GetYourGuide](https://partner.getyourguide.com/) · [Booking](https://partners.booking.com/) · [Amazon Associates](https://affiliate-program.amazon.com/).

### 2. Use the link prefix in any markdown file

```md
- [Eiffel Tower skip-the-line](viator:https://viator.com/tours/Paris/d479-12345)
- [Louvre guided tour](gyg:https://getyourguide.com/paris-l16/abc-12345)
- [Hotel near you](booking:https://booking.com/hotel/foo.html)
- [Travel adapter](amazon:https://amazon.com/dp/B07XYZ)
```

The build strips the `viator:` prefix, appends your partner ID as a query parameter, and adds `target="_blank" rel="sponsored noopener"` (Google requires the `sponsored` rel for paid links — done automatically).

If you leave a partner ID empty, the link still works — it just doesn't earn you a commission. Plain markdown links work as normal.

## Optional analytics

Plug in **one** privacy-friendly analytics provider to learn which sections guests actually open. All three options are GDPR-compliant without a cookie banner.

```ts
// src/config/property.ts — pick ONE, leave the rest as null
analytics: { plausible: { domain: 'guest-guide.example.com' } },
// analytics: { umami: { src: 'https://umami.example.com/script.js', websiteId: 'xxx' } },
// analytics: { goatcounter: { code: 'your-code' } },
// analytics: null,  // disabled (zero third-party requests)
```

Recommended providers:
- **[Plausible](https://plausible.io/)** — €9/mo or self-host (lightweight 1 KB script)
- **[Umami](https://umami.is/)** — free self-host, $20/mo cloud
- **[GoatCounter](https://www.goatcounter.com/)** — free for non-commercial sites

The hosted analytics dashboard tells you "Hot tub gets 80% of section views, Music system gets 5%" — now you know where to put your effort.

## Print a backup poster

When a guest's phone dies (or they just prefer paper), you want them to be able to walk to the fridge and find the Wi-Fi password and your phone number.

```bash
npm run poster
# → dist/poster.png  (A4 at 300 DPI, ~1.4 MB)
```

Two QR codes — one to join the Wi-Fi automatically, one to open the digital guide — plus the property name, Wi-Fi credentials in plain text, the host phone, and the European emergency number. All pulled from `src/config/property.ts`. Print at A4 with no scaling.

<p align="center">
  <img src="docs/screenshots/poster-preview.png" alt="Printable A4 poster preview" width="320"/>
</p>

The site itself also has a print stylesheet — guests can print any section page (rules, hot tub instructions, check-out) as clean monochrome A4. The web chrome (header, language switcher, footer, embedded maps) is hidden automatically.

## Adding or removing languages

Ships with EN/DE/HR/IT. Adding a new language is one command + a two-line edit.

### Auto-translate with DeepL (or OpenAI / Anthropic / Google)

```bash
# 1. Generate translated markdown for the target language (e.g. Spanish):
DEEPL_API_KEY=xxx npm run translate -- es

# Or pick a different provider:
OPENAI_API_KEY=xxx    npm run translate -- es --provider openai
ANTHROPIC_API_KEY=xxx npm run translate -- es --provider anthropic
GOOGLE_TRANSLATE_API_KEY=xxx npm run translate -- es --provider google
```

DeepL's [free tier](https://www.deepl.com/pro#developer) gives you 500k characters/month — more than enough for the ~30 KB of guidebook text. Get your free API key, set it as an env var, run the command. Translation takes about 30 seconds for all 13 sections.

The script preserves frontmatter (only `title` and `summary` are translated), markdown structure, links, code blocks, emoji, and `[bracketed placeholders]`. Pass `--force` to overwrite existing translations.

### Wire the language up

After translating, two more edits to make the language appear in the UI:

```ts
// src/i18n/ui.ts
export const languages = {
  en: 'English',
  de: 'Deutsch',
  hr: 'Hrvatski',
  it: 'Italiano',
  es: 'Español',   // ← add this
} as const;
```

```ts
// src/config/property.ts
languages: ['en', 'de', 'hr', 'it', 'es'],   // ← add 'es'
```

UI strings (nav labels, "Read more", category headings) automatically fall back to English for any language that doesn't have its own dictionary in `src/i18n/ui.ts`. To get fully native-language UI, copy the `en` block in `ui` and translate the values — about 30 strings.

### Supported language codes

The translate script accepts any ISO 2-letter code your provider supports. DeepL covers ~30 languages; OpenAI/Anthropic cover ~100. Common picks for vacation rentals: `es` (Spanish), `fr` (French), `nl` (Dutch), `pl` (Polish), `cs` (Czech), `sk` (Slovak), `sl` (Slovenian), `hu` (Hungarian), `pt` (Portuguese), `ja` (Japanese), `zh` (Chinese).

### Removing a language

Drop it from `PROPERTY.languages`, delete `src/content/sections/<lang>/`, and remove its entry from `src/i18n/ui.ts`. That's it.

> **Always do a human pass.** Machine translation gets you 90% of the way there. The other 10% — tone, idiom, local quirks like "OIB" vs "Tax ID" — still benefits from a native speaker reading through once.

## License

MIT — do whatever you want, no warranty.
