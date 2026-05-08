#!/usr/bin/env node
/**
 * Generate a printable A4 poster with two QR codes:
 *  1. Wi-Fi tap-to-join QR (WIFI: URI scheme — most modern phones join the
 *     network automatically when the camera reads it).
 *  2. Site QR — points at PROPERTY.siteUrl, opens the digital guide.
 *
 * Plus the property name, host phone, emergency number, and a one-line
 * "scan with your phone camera" instruction.
 *
 * USAGE
 *   npm run poster                 # writes dist/poster.png
 *   node scripts/generate-poster.mjs --out=public/poster.png
 *
 * The output is 2480 × 3508 px at 300 DPI (A4 portrait). Drop it into your
 * printer's A4 setting and you're done.
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';
import QRCode from 'qrcode';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── CLI parsing ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const outArg = args.find((a) => a.startsWith('--out='));
const out = outArg ? outArg.split('=')[1] : 'dist/poster.png';

// ─── Load PROPERTY ──────────────────────────────────────────────────────────
//
// We can't import the .ts file directly from a plain Node script, so we
// parse it as text and pull values via regex. Crude but zero-dependency.

const propertyTs = await readFile(resolve(ROOT, 'src/config/property.ts'), 'utf8');

// Pluck `key: '...'` or `key: "..."` from property.ts. Handles escaped
// quotes (e.g. `name: 'Maria\\'s House'` produced by bootstrap.mjs) by
// allowing backslash-escaped characters inside the captured string.
const pluck = (key, fallback = '') => {
  const re = new RegExp(`\\b${key}\\s*:\\s*'((?:\\\\.|[^'\\\\])*)'|\\b${key}\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`);
  const m = propertyTs.match(re);
  if (!m) return fallback;
  const raw = m[1] ?? m[2] ?? '';
  return raw.replace(/\\(.)/g, '$1');
};

const PROPERTY = {
  name: pluck('name', 'Your Property'),
  shortName: pluck('shortName', pluck('name', 'Your Property')),
  siteUrl: pluck('siteUrl', 'https://example.com'),
  city: pluck('city', ''),
  country: pluck('country', ''),
  wifi: {
    ssid: pluck('ssid', 'YourCabinWiFi'),
    password: pluck('password', 'replace-me-please'),
    encryption: pluck('encryption', 'WPA'),
  },
  hostName: '',
  hostPhone: '',
  emergency: '112',
};

// First host entry — match the first {role: ..., name: '...', phone: '...'}
const firstHost = propertyTs.match(/role:\s*['"]host['"][\s\S]*?name:\s*['"]([^'"]+)['"][\s\S]*?phone:\s*['"]([^'"]+)['"]/);
if (firstHost) {
  PROPERTY.hostName = firstHost[1];
  PROPERTY.hostPhone = firstHost[2];
}

// ─── QR codes ───────────────────────────────────────────────────────────────

const wifiURI = `WIFI:T:${PROPERTY.wifi.encryption};S:${PROPERTY.wifi.ssid};P:${PROPERTY.wifi.password};;`;

const wifiQr = await QRCode.toBuffer(wifiURI, {
  type: 'png',
  margin: 2,
  width: 720,
  errorCorrectionLevel: 'M',
  color: { dark: '#1A2A20', light: '#F4EFE6' },
});

const siteQr = await QRCode.toBuffer(PROPERTY.siteUrl, {
  type: 'png',
  margin: 2,
  width: 720,
  errorCorrectionLevel: 'M',
  color: { dark: '#1A2A20', light: '#F4EFE6' },
});

// ─── Compose the SVG layer (text + accents) ─────────────────────────────────
//
// A4 at 300 DPI = 2480 × 3508 px. We render text via SVG so we don't need to
// install fonts via Sharp directly — Sharp picks them up from system fonts.

const W = 2480;
const H = 3508;

const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const subtitle = [PROPERTY.city, PROPERTY.country].filter(Boolean).join(', ');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style>
      .display { font-family: 'Georgia', 'Times New Roman', serif; font-weight: 500; fill: #1A2A20; }
      .body    { font-family: 'Helvetica Neue', 'Helvetica', 'Arial', sans-serif; fill: #1A2A20; }
      .mono    { font-family: 'Menlo', 'Courier New', monospace; fill: #1A2A20; }
      .muted   { fill: #5b6a5e; }
      .accent  { fill: #c87b3e; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${W}" height="${H}" fill="#F4EFE6"/>

  <!-- Top eyebrow -->
  <text x="${W / 2}" y="280" text-anchor="middle" class="body" font-size="34" letter-spacing="6">
    GUEST GUIDE
  </text>

  <!-- Property name -->
  <text x="${W / 2}" y="430" text-anchor="middle" class="display" font-size="120">
    ${escape(PROPERTY.name)}
  </text>

  <!-- Subtitle -->
  ${subtitle ? `<text x="${W / 2}" y="510" text-anchor="middle" class="body muted" font-size="40">${escape(subtitle)}</text>` : ''}

  <!-- Divider -->
  <line x1="${W / 2 - 80}" y1="600" x2="${W / 2 + 80}" y2="600" stroke="#c87b3e" stroke-width="3"/>

  <!-- Wi-Fi label -->
  <text x="${W / 2}" y="780" text-anchor="middle" class="display" font-size="68">
    Wi-Fi
  </text>
  <text x="${W / 2}" y="850" text-anchor="middle" class="body muted" font-size="36">
    Scan with your phone camera to join automatically.
  </text>

  <!-- (QR composited below by sharp at y ≈ 920) -->

  <!-- Wi-Fi credentials text -->
  <text x="${W / 2}" y="1740" text-anchor="middle" class="body" font-size="36">
    Network: <tspan class="mono" font-weight="600">${escape(PROPERTY.wifi.ssid)}</tspan>
  </text>
  <text x="${W / 2}" y="1810" text-anchor="middle" class="body" font-size="36">
    Password: <tspan class="mono" font-weight="600">${escape(PROPERTY.wifi.password)}</tspan>
  </text>

  <!-- Divider -->
  <line x1="${W / 2 - 80}" y1="1920" x2="${W / 2 + 80}" y2="1920" stroke="#c87b3e" stroke-width="3"/>

  <!-- Guide label -->
  <text x="${W / 2}" y="2080" text-anchor="middle" class="display" font-size="68">
    Open the guide
  </text>
  <text x="${W / 2}" y="2150" text-anchor="middle" class="body muted" font-size="36">
    Everything about the property — rules, appliances, area, contacts.
  </text>

  <!-- (QR composited below by sharp at y ≈ 2220) -->

  <!-- Guide URL -->
  <text x="${W / 2}" y="3050" text-anchor="middle" class="mono" font-size="36">
    ${escape(PROPERTY.siteUrl.replace(/^https?:\/\//, ''))}
  </text>

  <!-- Bottom contact bar -->
  <line x1="200" y1="3180" x2="${W - 200}" y2="3180" stroke="#1A2A20" stroke-width="1" stroke-opacity="0.18"/>

  <!-- Emergency badge -->
  <rect x="200" y="3232" width="78" height="50" rx="8" fill="#c87b3e"/>
  <text x="239" y="3268" text-anchor="middle" class="body" font-size="28" font-weight="700" fill="#ffffff">112</text>
  <text x="298" y="3268" class="body" font-size="34">
    Emergency
  </text>

  ${PROPERTY.hostName ? `
  <text x="${W - 200}" y="3268" text-anchor="end" class="body" font-size="34">
    Host: <tspan font-weight="600">${escape(PROPERTY.hostName)}</tspan> · <tspan class="mono">${escape(PROPERTY.hostPhone)}</tspan>
  </text>
  ` : ''}
</svg>
`;

// ─── Composite ──────────────────────────────────────────────────────────────

const QR_SIZE = 720;
const wifiQrX = (W - QR_SIZE) / 2;
const wifiQrY = 920;
const siteQrX = (W - QR_SIZE) / 2;
const siteQrY = 2220;

const outAbs = resolve(ROOT, out);
await mkdir(dirname(outAbs), { recursive: true });

await sharp(Buffer.from(svg))
  .composite([
    { input: wifiQr, top: wifiQrY, left: wifiQrX },
    { input: siteQr, top: siteQrY, left: siteQrX },
  ])
  .png()
  .toFile(outAbs);

console.log(`✓ Poster written to ${out} (${W}×${H} px, A4 @ 300 DPI)`);
console.log(`\nProperty:    ${PROPERTY.name}`);
console.log(`Wi-Fi:       ${PROPERTY.wifi.ssid} / ${PROPERTY.wifi.password}`);
console.log(`Guide URL:   ${PROPERTY.siteUrl}`);
if (PROPERTY.hostName) console.log(`Host:        ${PROPERTY.hostName} · ${PROPERTY.hostPhone}`);
console.log(`\nPrint at A4 (no scaling) and stick it on the fridge.`);
