# Kraljica Šume — Guest Guide

Multilingual guest information microsite for **Divjake Log Home – Kraljica šume**, a luxury log cabin in Hlevci, Gorski kotar.

Lives at **info.divjakeloghome.com**. Replaces the third-party InfoSpot tool with a fast, brand-aligned, free-to-host static site.

## Stack

- [Astro 5](https://astro.build) (static)
- [Tailwind 4](https://tailwindcss.com) (Vite plugin)
- TypeScript strict
- i18n: HR (default), EN, DE, IT
- Hosted on Vercel

## Develop

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static output → dist/
npm run preview  # serve the built site locally
```

## Content

All content lives in `src/content/sections/<lang>/<slug>.md` as markdown with frontmatter:

```md
---
title: Hidromasažni bazen
icon: 💦
order: 1
summary: Pravila, higijena, sigurnost.
safetyCritical: true
---

Markdown body…
```

To add or edit content, just edit the markdown files. Frontmatter `order` controls the order on the index page.

## Languages

Source-of-truth language is **Croatian (HR)**. Other languages are translations of the HR source.

To add a new language:

1. Add the locale code to `src/i18n/ui.ts` (UI strings) and `astro.config.mjs` (i18n locales).
2. Create `src/content/sections/<code>/` and translate each file.
3. Add the language entry to the language switcher map.

## Privacy

The site is `noindex, nofollow` at three layers:
- `<meta robots>` in `Layout.astro`
- `public/robots.txt`
- `X-Robots-Tag` header in `vercel.json`

Publicly accessible (no auth) but kept out of search engines — the audience is current guests, not search traffic.

## Deploying

Pushes to `main` deploy to production via the Vercel integration.

Custom domain `info.divjakeloghome.com` is configured in the Vercel project's Domains tab. The apex domain `divjakeloghome.com` is managed via Cloudflare; create a `CNAME` record `info → cname.vercel-dns.com`.
