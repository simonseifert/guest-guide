#!/usr/bin/env node
/**
 * AI guidebook bootstrapper.
 *
 * Takes a property description (or a publicly-scrapeable listing URL) and
 * generates a complete first-draft guidebook: src/config/property.ts plus
 * 8-10 section markdown files. The host then runs `npm run dev`, reviews,
 * edits, and ships.
 *
 * USAGE
 *   ANTHROPIC_API_KEY=sk-ant-... npm run bootstrap
 *   ANTHROPIC_API_KEY=...        npm run bootstrap -- --url=https://airbnb.com/rooms/12345
 *   ANTHROPIC_API_KEY=...        npm run bootstrap -- --description="3-bed cabin in Aspen with hot tub and sauna"
 *   npm run bootstrap -- --dry-run                     # show what would be written
 *
 * INPUT
 *   - Free-form description (--description) or a URL to scrape (--url)
 *   - The CLI also asks interactively if neither is provided
 *
 * OUTPUT
 *   - src/config/property.ts            (overwritten — back up first if you've edited it!)
 *   - src/content/sections/en/*.md      (overwritten)
 *
 * WHY THIS IS SAFE
 *   - The AI runs once, at bootstrap time. After it finishes, the runtime is
 *     pure static markdown — no API key, no backend, no third-party calls.
 *   - The script asks for explicit confirmation before overwriting any file.
 *   - --dry-run prints the plan without touching the disk.
 */

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── CLI parsing ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const urlArg = args.find((a) => a.startsWith('--url='));
const descArg = args.find((a) => a.startsWith('--description='));
const dryRun = args.includes('--dry-run');
const skipConfirm = args.includes('--yes') || args.includes('-y');

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY env var is required.');
  console.error('Get one at: https://console.anthropic.com/');
  process.exit(1);
}

// ─── Source description ────────────────────────────────────────────────────

const rl = createInterface({ input: stdin, output: stdout });
const ask = (q) => rl.question(q);

let sourceText = '';
let sourceLabel = '';

if (urlArg) {
  const url = urlArg.split('=')[1];
  sourceLabel = url;
  console.log(`\nScraping ${url}…`);
  sourceText = await scrapeUrl(url);
  console.log(`Got ${sourceText.length} chars of context.\n`);
} else if (descArg) {
  sourceText = descArg.split('=')[1];
  sourceLabel = '(from --description flag)';
} else {
  console.log('\n✨ Guest Guide bootstrapper\n');
  console.log('Describe your property — type or paste anything useful: name, location,');
  console.log('how many rooms, amenities (hot tub, sauna, fireplace), house rules,');
  console.log('Wi-Fi network if you want, anything. Press Enter twice when done.\n');
  sourceText = await readMultiline(rl);
  sourceLabel = '(interactive description)';
}

if (!sourceText.trim()) {
  console.error('No source text provided.');
  process.exit(1);
}

const language = (await ask('\nPrimary language? [en]: ')).trim() || 'en';
const sectionsAns = (await ask('\nWhich sections? Comma-separated, or "all" for the full kit\n[welcome,rules,checkout,emergency + auto-detect amenities]: ')).trim();
rl.close();

const requestedSections = sectionsAns && sectionsAns !== 'all'
  ? sectionsAns.split(',').map((s) => s.trim()).filter(Boolean)
  : null;

// ─── Call Claude with structured tool use ───────────────────────────────────

console.log('\nGenerating with Claude…');
const guidebook = await generateGuidebook({ sourceText, language, requestedSections });

// ─── Preview ────────────────────────────────────────────────────────────────

console.log('\n┌─ Plan ──────────────────────────────────────────────────────');
console.log(`│ Source:    ${sourceLabel}`);
console.log(`│ Language:  ${language}`);
console.log(`│ Property:  ${guidebook.property.brand.name} (${guidebook.property.address.city}, ${guidebook.property.address.country})`);
console.log(`│ Sections:  ${Object.keys(guidebook.sections).join(', ')}`);
console.log('└─────────────────────────────────────────────────────────────\n');

if (dryRun) {
  console.log('--dry-run set; not writing any files.');
  process.exit(0);
}

if (!skipConfirm) {
  const rl2 = createInterface({ input: stdin, output: stdout });
  const ok = await rl2.question('Write files? This OVERWRITES src/config/property.ts and section markdown. [y/N] ');
  rl2.close();
  if (!ok.trim().toLowerCase().startsWith('y')) {
    console.log('Aborted — nothing written.');
    process.exit(0);
  }
}

// ─── Write files ────────────────────────────────────────────────────────────

await writeProperty(guidebook.property);
console.log('  ✓ src/config/property.ts');

const sectionDir = resolve(ROOT, `src/content/sections/${language}`);
await mkdir(sectionDir, { recursive: true });
for (const [slug, content] of Object.entries(guidebook.sections)) {
  await writeFile(join(sectionDir, `${slug}.md`), content);
  console.log(`  ✓ src/content/sections/${language}/${slug}.md`);
}

console.log('\nDone. Run `npm run dev` to preview.');
console.log('To translate to other languages: `DEEPL_API_KEY=... npm run translate -- de`');
console.log('\nReview the generated content carefully — AI gets you 90% there, but the');
console.log('details (Wi-Fi password, exact appliances, real local picks) need a human pass.');

// ────────────────────────────────────────────────────────────────────────────
// Implementation
// ────────────────────────────────────────────────────────────────────────────

async function scrapeUrl(url) {
  // Public sites work; auth-walled ones (Airbnb often is) may need user-paste.
  let html;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; guest-guide-bootstrap/1.0)',
        Accept: 'text/html',
      },
    });
    html = await res.text();
  } catch (err) {
    console.warn(`Couldn't fetch ${url}: ${err.message}`);
    console.warn('Falling back to interactive description.');
    return '';
  }

  // Pull out the most useful text: <title>, meta description, og:* tags,
  // visible body text. Don't try to parse the full DOM — Claude is good at
  // making sense of messy HTML excerpts.
  const ogTitle = matchMeta(html, 'og:title');
  const ogDesc = matchMeta(html, 'og:description');
  const title = match1(html, /<title[^>]*>([^<]+)<\/title>/i) ?? '';
  const description = matchMeta(html, 'description');

  // Strip scripts, styles, then collapse whitespace from body text.
  const stripped = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000); // hard cap so we don't blow out the context window

  return [
    `URL: ${url}`,
    title && `Title: ${title}`,
    ogTitle && ogTitle !== title && `OG title: ${ogTitle}`,
    description && `Description: ${description}`,
    ogDesc && ogDesc !== description && `OG description: ${ogDesc}`,
    '',
    'Page text excerpt:',
    stripped,
  ].filter(Boolean).join('\n');
}

function matchMeta(html, key) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i');
  return match1(html, re);
}
function match1(html, re) {
  const m = html.match(re);
  return m ? m[1] : null;
}

async function readMultiline(rl) {
  const lines = [];
  let blank = 0;
  while (true) {
    const line = await rl.question(lines.length === 0 ? '> ' : '');
    if (!line.trim()) {
      blank++;
      if (blank >= 1 && lines.length > 0) break;
      continue;
    }
    blank = 0;
    lines.push(line);
  }
  return lines.join('\n');
}

async function generateGuidebook({ sourceText, language, requestedSections }) {
  // Tool schema: Claude returns a single structured object. Forcing tool use
  // gives us JSON we can trust without fragile prompt-engineering for format.
  const sectionPropertiesEntries = ALL_SECTIONS.map((slug) => [slug, { type: 'string', description: SECTION_HINTS[slug] }]);

  const tool = {
    name: 'write_guidebook',
    description: 'Write the guest guide for the property described by the user.',
    input_schema: {
      type: 'object',
      required: ['property', 'sections'],
      properties: {
        property: {
          type: 'object',
          required: ['brand', 'address', 'hosts', 'wifi', 'hero', 'siteUrl'],
          properties: {
            brand: {
              type: 'object',
              required: ['name', 'shortName', 'tagline'],
              properties: {
                name: { type: 'string' },
                shortName: { type: 'string' },
                tagline: { type: 'string' },
              },
            },
            address: {
              type: 'object',
              required: ['line1', 'city', 'postcode', 'country'],
              properties: {
                line1: { type: 'string' },
                city: { type: 'string' },
                postcode: { type: 'string' },
                country: { type: 'string' },
              },
            },
            taxId: { type: ['string', 'null'] },
            website: { type: 'string' },
            hosts: {
              type: 'array',
              items: {
                type: 'object',
                required: ['role', 'name', 'phone'],
                properties: {
                  role: { type: 'string', enum: ['host', 'helper', 'manager'] },
                  name: { type: 'string' },
                  phone: { type: 'string', description: 'E.164 format with placeholder if unknown' },
                },
              },
            },
            wifi: {
              type: 'object',
              required: ['ssid', 'password', 'encryption'],
              properties: {
                ssid: { type: 'string' },
                password: { type: 'string', description: 'placeholder is fine' },
                encryption: { type: 'string', enum: ['WPA', 'WEP', 'nopass'] },
              },
            },
            hero: {
              type: 'object',
              required: ['photoAlt'],
              properties: {
                photoAlt: { type: 'string', description: 'one-line photo alt text describing the property' },
              },
            },
            mapPlaceLabel: { type: 'string', description: 'short address shown by the map open-in link' },
            siteUrl: { type: 'string' },
          },
        },
        sections: {
          type: 'object',
          description: 'Markdown content for each section. Each value is the full file content with frontmatter.',
          properties: Object.fromEntries(sectionPropertiesEntries),
          required: ['welcome', 'rules', 'checkout', 'emergency'],
        },
      },
    },
  };

  const systemPrompt = [
    'You are a vacation-rental copywriter. You generate the first-draft guest guidebook for a property based on the description provided.',
    '',
    'Output format: call the write_guidebook tool with the structured property config and one markdown string per section.',
    '',
    'Each section markdown MUST start with frontmatter exactly like this:',
    '---',
    'title: <Translated section title>',
    'icon: <single emoji>',
    'order: <number 0-99>',
    'category: <rules | indulge | tech | stay | omit for welcome>',
    'summary: <one-line description shown on homepage card>',
    'safetyCritical: <true | false>',
    '---',
    '',
    'Then markdown body. Use h2 (##) and h3 (###), lists, **bold**, *italic*, > blockquote callouts.',
    '',
    `Write everything in language code: ${language}`,
    '',
    'Section order conventions:',
    '- welcome: order 99 (special — pinned to top, no category)',
    '- rules: order 0, category rules',
    '- jacuzzi/sauna/grill/tv: order 1-4, category indulge',
    '- coffee/oven/water/avr: order 5-8, category tech',
    '- checkout/places/explore/emergency: order 8-10, category stay',
    '',
    'Only generate sections that make sense for the described property. Skip sections for amenities the property does not have.',
    '',
    'Add safetyCritical: true for hot tubs, saunas, and fire features.',
    '',
    'Use ONLY information from the description. If something is not provided, use sensible neutral placeholders like "Your Name", "+1 555 0100", "YourCabinWiFi", "replace-me-please". Never invent specific products, brand names, or addresses.',
    '',
    'Tone: warm, concise, native-sounding. Imagine the host writing notes for guests, not a marketing brochure.',
  ].join('\n');

  const userPrompt = [
    `Source description:\n\n${sourceText}`,
    '',
    requestedSections
      ? `Generate exactly these sections: ${requestedSections.join(', ')}`
      : 'Generate the welcome, rules, checkout, and emergency sections, plus any amenity sections the description suggests (jacuzzi/sauna/grill/tv/coffee/oven/water/avr/places/explore).',
  ].join('\n');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-7',
      max_tokens: 16000,
      system: systemPrompt,
      tools: [tool],
      tool_choice: { type: 'tool', name: 'write_guidebook' },
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const toolUse = data.content.find((c) => c.type === 'tool_use');
  if (!toolUse) throw new Error('Claude did not return a tool_use block');
  return toolUse.input;
}

async function writeProperty(input) {
  const taxId = input.taxId == null ? 'null' : `'${escapeStr(input.taxId)}'`;
  const hosts = input.hosts.map((h) =>
    `    {\n` +
    `      role: '${escapeStr(h.role)}',\n` +
    `      name: '${escapeStr(h.name)}',\n` +
    `      phone: '${escapeStr(h.phone)}',\n` +
    `    },`
  ).join('\n');

  const out = `/**
 * Property configuration — generated by scripts/bootstrap.mjs.
 * Edit freely; this is the single source of truth for everything the
 * template renders.
 */

export type Lang = 'en' | 'de' | 'hr' | 'it';

export const PROPERTY = {
  brand: {
    name: '${escapeStr(input.brand.name)}',
    shortName: '${escapeStr(input.brand.shortName)}',
    logoSrc: '/logo.svg',
    tagline: '${escapeStr(input.brand.tagline)}',
  },

  address: {
    line1: '${escapeStr(input.address.line1)}',
    city: '${escapeStr(input.address.city)}',
    postcode: '${escapeStr(input.address.postcode)}',
    country: '${escapeStr(input.address.country)}',
  },
  taxId: ${taxId} as string | null,
  website: '${escapeStr(input.website ?? '')}',

  hosts: [
${hosts}
  ],

  wifi: {
    ssid: '${escapeStr(input.wifi.ssid)}',
    password: '${escapeStr(input.wifi.password)}',
    encryption: '${input.wifi.encryption}' as 'WPA' | 'WEP' | 'nopass',
  },

  hero: {
    photoSrc: '/images/hero-placeholder.svg',
    photoAlt: '${escapeStr(input.hero.photoAlt)}',
  },

  map: {
    embedUrl: 'https://www.google.com/maps?q=${encodeURIComponent(input.address.city + ' ' + input.address.country)}&output=embed',
    shareUrl: 'https://www.google.com/maps?q=${encodeURIComponent(input.address.city + ' ' + input.address.country)}',
    placeLabel: '${escapeStr(input.mapPlaceLabel ?? `${input.address.city} · ${input.address.country}`)}',
  },

  languages: ['en', 'de', 'hr', 'it'] as Lang[],
  defaultLanguage: 'en' as Lang,

  noindex: true,

  siteUrl: '${escapeStr(input.siteUrl)}',

  affiliates: { viator: '', getYourGuide: '', booking: '', amazon: '' },
  analytics: null as
    | null
    | { plausible: { domain: string; src?: string } }
    | { umami: { src: string; websiteId: string } }
    | { goatcounter: { code: string } },
} as const;

export type PropertyConfig = typeof PROPERTY;
`;

  await writeFile(resolve(ROOT, 'src/config/property.ts'), out);
}

function escapeStr(s) {
  return String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// All section slugs the template knows how to render. The AI may produce a
// subset based on the property description.
const ALL_SECTIONS = [
  'welcome', 'rules',
  'jacuzzi', 'sauna', 'grill', 'tv',
  'coffee', 'oven', 'water', 'avr',
  'checkout', 'places', 'explore', 'emergency',
];

const SECTION_HINTS = {
  welcome: 'order 99 (pinned). Wi-Fi mention, key info (check-in/out times, quiet hours), small tips, driving tips if relevant, guest registration if required.',
  rules: 'order 0, category rules. Quiet hours, additional guests, smoking, pets, pool/safety, candle/fire, treat-it-like-your-own.',
  jacuzzi: 'order 1, category indulge, safetyCritical: true. Rules of use, water care, after-use cover.',
  sauna: 'order 2, category indulge, safetyCritical: true. Lighting, steam, duration, safety, after-use.',
  grill: 'order 3, category indulge. Prep, cooking, cleaning.',
  tv: 'order 4, category indulge. How to use TV + streaming apps, sign-out reminder.',
  coffee: 'order 5, category tech. Power on, troubleshooting if no coffee, warning lights, steam wand.',
  oven: 'order 6, category tech. Clock, programmes, first use, safety.',
  water: 'order 7, category tech. Boiler controls, ECO mode, recovery times, fault flashing.',
  avr: 'order 8, category tech. Power, volume, input, Bluetooth pairing, troubleshooting.',
  checkout: 'order 8, category stay. Time, late check-out fees, deposit, before-you-leave checklist.',
  places: 'order 9, category stay. Walking distance, drive distance, where to eat, by-season tips.',
  explore: 'order 9, category stay. Same as places but more narrative/personal recommendations.',
  emergency: 'order 10, category stay. Host contact reference, 112 + local numbers, healthcare nearby, damage/malfunction.',
};
