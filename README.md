# Cabin Guide

A multilingual, offline-capable, brand-customizable **guest information PWA** for vacation rentals — cabins, villas, apartments, anything you let guests stay in.

Replaces clunky third-party "guest info" SaaS tools (InfoSpot, lower-tier TouchStay, etc.) with a fast static site you own, built on **Astro 5 + Tailwind 4**. Mobile-first, sub-200kb first load, full offline support after the first visit.

[**Live demo**](https://kraljica-sume-info.vercel.app/hr) — the original deployment for [Divjake Log Home – Kraljica šume](https://divjakeloghome.com), a log cabin in Gorski kotar, Croatia.

---

## Features

- 📱 **Mobile-first** — designed at 390px, scales clean to desktop
- 🌍 **Multilingual** — Croatian / English / German / Italian out of the box, drop or add any
- 🛜 **PWA + offline** — service worker precaches the whole site (~1.4 MB) so guests with patchy cabin signal can still read instructions
- 🪪 **Wi-Fi tap-to-join QR** — guests scan with their camera, phone joins automatically (`WIFI:` URI scheme)
- 🗺️ **Embedded interactive map** for nearby places + open-in-Maps deeplink
- ☎️ **Tap-to-call** emergency + host contact numbers
- 🎨 **Brand-customizable** — single config file (`src/config/property.ts`) controls all property-specific data
- 🔒 **`noindex` by default** — guest info, not search-traffic content

## Quick start

```bash
git clone https://github.com/simonseifert/cabin-guide.git my-cabin-guide
cd my-cabin-guide
npm install
npm run dev          # open http://localhost:4321
```

## Customize for your property — 4 steps

### 1. Edit `src/config/property.ts`

Single source of truth for everything property-specific: name, address, host names + phone numbers, Wi-Fi SSID + password, map URLs, languages.

```ts
export const PROPERTY = {
  brand: { name: 'My Cabin', shortName: 'My Cabin', logoSrc: '/cabin-logo.svg', tagline: 'Guest guide' },
  address: { line1: '...', city: '...', postcode: '...', country: '...' },
  oib: null, // Croatian tax ID — set to null to hide the row entirely
  hosts: [
    { role: 'host', name: 'Your Name', phone: '+1 555 0100' },
    { role: 'helper', name: 'Local Helper', phone: '+1 555 0101' },
  ],
  wifi: { ssid: 'MyCabinWiFi', password: 'replace-me-please', encryption: 'WPA' },
  hero: { photoSrc: '/images/hero-twilight.jpg', photoAlt: 'A cabin at twilight' },
  map: { embedUrl: '...', shareUrl: '...', placeLabel: 'Address · Area' },
  languages: ['hr', 'en', 'de', 'it'],
  defaultLanguage: 'hr',
  noindex: true,
  siteUrl: 'https://your-cabin.example.com',
};
```

### 2. Replace assets in `/public/`

| File | Replace with |
|---|---|
| `cabin-logo.svg` | Your wordmark (white-on-transparent, ~612×120 viewBox works best for the dark hero overlay) |
| `images/hero-twilight.jpg` | Your hero photo (~1920×1280 atmospheric) |
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

The starter content is the real working content from the demo property. Read it, edit it, replace it. The category labels and homepage section eyebrows live in `src/i18n/ui.ts`.

### 4. Deploy

```bash
npm run build              # → ./dist/
```

Anywhere static-hosted will do. Recommended: **Vercel** — push to GitHub, click "Import" in Vercel dashboard, done. No env vars needed.

## Architecture

```
src/
  config/property.ts                ← edit me first
  content/sections/{hr,en,de,it}/*.md
  components/
    Hero, WifiCard, RulesFeature, AntlerDivider,
    SectionGroup, SectionRow, MapPreview, Icon
  layouts/Layout.astro              ← header + footer + html shell
  pages/
    index.astro                     ← / → language-detected redirect
    [lang]/index.astro              ← /hr, /en, /de, /it (homepages)
    [lang]/[slug].astro             ← per-section pages
  i18n/ui.ts                        ← UI strings + per-language labels
  styles/global.css                 ← design system tokens + component CSS
public/
  cabin-logo.svg                    ← your wordmark
  favicon.svg, icon-*.png, apple-touch-icon.png
  images/hero-twilight.jpg          ← your hero photo
  manifest.webmanifest              ← (auto-generated at build)
scripts/generate-icons.mjs          ← regenerates PWA icons from a source SVG
```

## Stack

- [Astro 5](https://astro.build) (static export)
- [Tailwind 4](https://tailwindcss.com) via the Vite plugin
- TypeScript strict
- [@vite-pwa/astro](https://vite-pwa-org.netlify.app/frameworks/astro.html) for service worker + manifest generation (Workbox under the hood)
- [qrcode](https://github.com/soldair/node-qrcode) for build-time Wi-Fi QR generation
- [rehype-external-links](https://github.com/rehypejs/rehype-external-links) so external markdown links open in new tabs

## Adding or removing languages

Ships with HR/EN/DE/IT. To trim or add:

1. Edit `PROPERTY.languages` in `src/config/property.ts`.
2. Update the `Lang` union and the `languages` map in `src/i18n/ui.ts`.
3. Add or remove the corresponding `src/content/sections/<lang>/` directories.
4. Update the per-language translation maps in `Hero.astro`, `MapPreview.astro`, `WifiCard.astro`, and `Layout.astro` if you change the locale set.

## License

MIT — do whatever you want, no warranty.

## Credits

Built for [Divjake Log Home – Kraljica šume](https://divjakeloghome.com), then generalized into this template. The original Croatian content + Gorski kotar tourism info ships as example content — replace it for your own property.
