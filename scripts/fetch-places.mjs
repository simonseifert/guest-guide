#!/usr/bin/env node
/**
 * Fetch place details + photos from Google Places API (v1) and generate
 * a brand-neutral "Places" section for the guest guide. Run once during
 * setup; re-run whenever the host adds or removes places.
 *
 * USAGE
 *   GOOGLE_PLACES_API_KEY=xxx npm run fetch-places
 *   npm run fetch-places -- --slug attractions   # custom section slug
 *   npm run fetch-places -- --langs en,de        # only these languages
 *
 * INPUT  places.config.json   (copy from places.config.example.json)
 * OUTPUT src/content/sections/<lang>/places.md   (one per language)
 *        public/places/<place_id>-1.jpg          (first photo, ~800px wide)
 *
 * COSTS
 *   Places API "Place Details (Pro)" SKU: $0.017 per request after free tier
 *   Photos: $0.007 per request. Free tier covers most small templates.
 *   Cache the responses in .places-cache/ so re-runs don't re-bill.
 *
 * The script uses Google's Places API (New) — `places.googleapis.com/v1/`.
 * The legacy `maps.googleapis.com/maps/api/place/` endpoint is deprecated
 * and will be retired; don't switch back to it.
 */

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── CLI parsing ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const slugArg = args.find((a) => a.startsWith('--slug='));
const langsArg = args.find((a) => a.startsWith('--langs='));
const slug = slugArg ? slugArg.split('=')[1] : 'places';
const explicitLangs = langsArg ? langsArg.split('=')[1].split(',') : null;
const force = args.includes('--force');

const apiKey = process.env.GOOGLE_PLACES_API_KEY;
if (!apiKey) {
  console.error('GOOGLE_PLACES_API_KEY env var is required.');
  console.error('Get one at: https://console.cloud.google.com/google/maps-apis/credentials');
  process.exit(1);
}

// ─── Load config ────────────────────────────────────────────────────────────

const configPath = resolve(ROOT, 'places.config.json');
if (!existsSync(configPath)) {
  console.error(`Config not found: places.config.json`);
  console.error(`Copy places.config.example.json and fill in Place IDs.`);
  process.exit(1);
}

const config = JSON.parse(await readFile(configPath, 'utf8'));

// ─── Load PROPERTY for languages + brand context ────────────────────────────

const propertyTs = await readFile(resolve(ROOT, 'src/config/property.ts'), 'utf8');
const langsMatch = propertyTs.match(/languages:\s*\[([^\]]+)\]/);
const allLangs = langsMatch
  ? langsMatch[1].split(',').map((s) => s.replace(/['"\s]/g, '')).filter(Boolean)
  : ['en'];
const targetLangs = explicitLangs ?? allLangs;

console.log(`Fetching for languages: ${targetLangs.join(', ')}`);
console.log(`Output slug: ${slug}\n`);

// ─── Cache (avoid re-billing on re-runs) ────────────────────────────────────

const cacheDir = resolve(ROOT, '.places-cache');
await mkdir(cacheDir, { recursive: true });

async function cacheGet(key) {
  const path = join(cacheDir, `${key}.json`);
  if (!existsSync(path)) return null;
  if (force) return null;
  // Cache for 30 days — places change rarely.
  const age = Date.now() - (await stat(path)).mtimeMs;
  if (age > 30 * 24 * 60 * 60 * 1000) return null;
  return JSON.parse(await readFile(path, 'utf8'));
}
async function cacheSet(key, value) {
  await writeFile(join(cacheDir, `${key}.json`), JSON.stringify(value, null, 2));
}

// ─── Google Places fetchers ─────────────────────────────────────────────────

const FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'rating',
  'userRatingCount',
  'editorialSummary',
  'photos',
  'location',
  'regularOpeningHours.weekdayDescriptions',
  'googleMapsUri',
].join(',');

async function fetchPlace(placeId, lang) {
  const cacheKey = `${placeId}-${lang}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const url = `https://places.googleapis.com/v1/places/${placeId}?languageCode=${lang}`;
  const res = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
  });
  if (!res.ok) {
    throw new Error(`Places API error for ${placeId}: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  await cacheSet(cacheKey, data);
  return data;
}

async function downloadFirstPhoto(place, placeId) {
  if (!place.photos?.[0]) return null;
  const photoName = place.photos[0].name; // e.g. "places/XXX/photos/YYY"
  const localName = `${placeId}-1.jpg`;
  const outPath = resolve(ROOT, 'public/places', localName);
  if (existsSync(outPath) && !force) return `/places/${localName}`;

  const url = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=800&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  photo error for ${placeId}: ${res.status}`);
    return null;
  }
  await mkdir(dirname(outPath), { recursive: true });
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(outPath, buf);
  return `/places/${localName}`;
}

// ─── Markdown rendering ─────────────────────────────────────────────────────

function renderPlace(place, photoPath) {
  const name = place.displayName?.text ?? 'Unknown place';
  const summary = place.editorialSummary?.text ?? '';
  const rating = place.rating ? `⭐ ${place.rating.toFixed(1)}` : '';
  const reviews = place.userRatingCount ? ` (${formatCount(place.userRatingCount)})` : '';
  const mapsUri = place.googleMapsUri ?? `https://www.google.com/maps/place/?q=place_id:${place.id}`;
  const hours = place.regularOpeningHours?.weekdayDescriptions?.[0] ?? '';

  const lines = [];
  if (photoPath) {
    lines.push(`![${escapeAlt(name)}](${photoPath})`);
    lines.push('');
  }
  let header = `**[${name}](${mapsUri})**`;
  if (rating) header += `  ${rating}${reviews}`;
  lines.push(header);
  if (summary) lines.push('', summary);
  if (hours) lines.push('', `🕐 ${hours}`);
  return lines.join('\n');
}

function formatCount(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M reviews`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k reviews`;
  return `${n} reviews`;
}

function escapeAlt(s) {
  return String(s).replace(/[\[\]]/g, '');
}

// ─── Section file rendering ─────────────────────────────────────────────────

const FRONTMATTER_BY_LANG = {
  en: { title: 'Places to visit', summary: 'Curated picks nearby — what to see, where to eat, what we love.' },
  de: { title: 'Sehenswürdigkeiten', summary: 'Unsere Favoriten in der Umgebung — was zu sehen, wo zu essen, was wir lieben.' },
  hr: { title: 'Mjesta za posjetiti', summary: 'Naši odabiri u blizini — što vidjeti, gdje jesti, što volimo.' },
  it: { title: 'Posti da visitare', summary: 'I nostri preferiti nei dintorni — cosa vedere, dove mangiare, cosa ci piace.' },
  es: { title: 'Lugares para visitar', summary: 'Nuestras recomendaciones cercanas — qué ver, dónde comer, qué nos gusta.' },
  fr: { title: 'Lieux à visiter', summary: 'Nos coups de cœur près d\'ici — quoi voir, où manger, ce qu\'on aime.' },
};

function renderSection(lang, blocks) {
  const fm = FRONTMATTER_BY_LANG[lang] ?? FRONTMATTER_BY_LANG.en;
  return [
    '---',
    `title: ${fm.title}`,
    'icon: 🗺️',
    'order: 9',
    'category: stay',
    `summary: ${fm.summary}`,
    '---',
    '',
    '<!-- Generated by scripts/fetch-places.mjs — re-run to refresh. -->',
    '',
    ...blocks,
  ].join('\n');
}

// ─── Main ───────────────────────────────────────────────────────────────────

let total = 0;
let failed = 0;

for (const lang of targetLangs) {
  console.log(`\n[${lang}] processing ${config.categories.length} categories…`);
  const blocks = [];

  for (const cat of config.categories) {
    if (!cat.places?.length) continue;
    const headline = cat.icon ? `## ${cat.icon} ${cat.name}` : `## ${cat.name}`;
    const sub = cat.subhead ? ` / ${cat.subhead}` : '';
    blocks.push(headline + sub, '');

    for (const entry of cat.places) {
      total++;
      try {
        const place = await fetchPlace(entry.id, lang);
        const photoPath = lang === targetLangs[0] ? await downloadFirstPhoto(place, entry.id) : `/places/${entry.id}-1.jpg`;
        blocks.push(renderPlace(place, photoPath));
        blocks.push('');
        console.log(`  ✓ ${place.displayName?.text ?? entry.id}`);
      } catch (err) {
        failed++;
        console.error(`  ✗ ${entry.id}: ${err.message}`);
      }
    }
  }

  const outPath = resolve(ROOT, `src/content/sections/${lang}/${slug}.md`);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, renderSection(lang, blocks));
  console.log(`  → wrote ${outPath.replace(ROOT + '/', '')}`);
}

console.log(`\nDone — ${total - failed} succeeded, ${failed} failed.`);
console.log(`Cache stored at .places-cache/ (gitignored, safe to delete to re-fetch).`);
