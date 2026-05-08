#!/usr/bin/env node
/**
 * Generate PWA icons from a source SVG.
 * Outputs:
 *   public/icon-192.png      — Android Chrome / general PWA
 *   public/icon-512.png      — high-res PWA
 *   public/icon-maskable.png — Android adaptive icon (safe-area padded)
 *   public/apple-touch-icon.png — iOS home screen (180x180)
 *
 * Run: node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, '..', 'public');

// Forest-green square with the antler mark in cream — matches the brand.
const FOREST = '#1A2A20';
const CREAM = '#F4EFE6';

const sourceSvg = ({ inset = 0.18 } = {}) => {
  // The antler glyph viewBox is 64x64. We center it within a 512x512 canvas
  // with `inset` percent padding on all sides so the mark breathes.
  const size = 512;
  const pad = Math.round(size * inset);
  const inner = size - 2 * pad;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${FOREST}"/>
    <g transform="translate(${pad}, ${pad}) scale(${inner / 64})">
      <g stroke="${CREAM}" stroke-width="3.5" stroke-linecap="round" fill="none">
        <path d="M32 50 L32 30"/>
        <path d="M32 32 C 28 28, 24 26, 18 22 M22 24 L18 18 M24 26 L20 22 M28 28 L26 22"/>
        <path d="M32 32 C 36 28, 40 26, 46 22 M42 24 L46 18 M40 26 L44 22 M36 28 L38 22"/>
      </g>
      <circle cx="32" cy="52" r="3.5" fill="${CREAM}"/>
    </g>
  </svg>`;
};

async function main() {
  const standard = Buffer.from(sourceSvg({ inset: 0.18 }));
  const maskable = Buffer.from(sourceSvg({ inset: 0.30 })); // larger safe-area padding

  const targets = [
    { src: standard, size: 192, name: 'icon-192.png' },
    { src: standard, size: 512, name: 'icon-512.png' },
    { src: standard, size: 180, name: 'apple-touch-icon.png' },
    { src: maskable, size: 512, name: 'icon-maskable.png' },
  ];

  for (const { src, size, name } of targets) {
    const out = resolve(PUBLIC_DIR, name);
    const buf = await sharp(src).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
    await writeFile(out, buf);
    console.log(`✓ ${name} (${size}×${size})`);
  }

  // Also save a copy of the source as a static SVG icon for browsers that prefer SVG.
  await writeFile(resolve(PUBLIC_DIR, 'icon.svg'), sourceSvg());
  console.log('✓ icon.svg');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
