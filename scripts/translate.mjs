#!/usr/bin/env node
/**
 * Translate src/content/sections/en/*.md into another language using DeepL,
 * OpenAI, Anthropic, or Google Translate.
 *
 * USAGE
 *   node scripts/translate.mjs <target-lang> [--provider deepl|openai|anthropic|google] [--force]
 *
 * EXAMPLES
 *   node scripts/translate.mjs es                       # Spanish via DeepL (default)
 *   node scripts/translate.mjs fr --provider openai     # French via OpenAI
 *   node scripts/translate.mjs nl --provider anthropic  # Dutch via Claude
 *   node scripts/translate.mjs pl --force               # re-translate even if files exist
 *
 * ENV
 *   DEEPL_API_KEY        # required for --provider deepl
 *   OPENAI_API_KEY       # required for --provider openai
 *   ANTHROPIC_API_KEY    # required for --provider anthropic
 *   GOOGLE_TRANSLATE_API_KEY  # required for --provider google
 *
 * AFTER RUNNING
 *   1. Add the language code to `languages` in src/i18n/ui.ts
 *   2. Add it to `PROPERTY.languages` in src/config/property.ts
 *   3. (Optional) Translate the per-language UI strings in src/i18n/ui.ts —
 *      anything not present falls back to English.
 *   4. Run `npm run dev` and review the generated content. Machine translation
 *      gets you 90% of the way there but always needs a human pass for tone
 *      and local idiom.
 *
 * Markdown structure (frontmatter, headings, lists, links, code blocks) is
 * preserved by sending the markdown as-is and instructing the model to
 * preserve it. DeepL handles HTML/XML reliably; for OpenAI/Anthropic we use
 * a structured prompt that locks formatting.
 */

import { readFile, writeFile, readdir, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SECTIONS = join(ROOT, 'src/content/sections');

// ─── CLI parsing ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const targetLang = args[0];
const force = args.includes('--force');
const providerFlag = args.findIndex((a) => a === '--provider');
const provider = providerFlag >= 0 ? args[providerFlag + 1] : 'deepl';

if (!targetLang || targetLang.startsWith('-')) {
  console.error('Usage: node scripts/translate.mjs <target-lang> [--provider deepl|openai|anthropic|google] [--force]');
  process.exit(1);
}

if (!/^[a-z]{2}$/.test(targetLang)) {
  console.error(`Invalid language code: "${targetLang}". Use a 2-letter ISO code (e.g. es, fr, nl).`);
  process.exit(1);
}

if (targetLang === 'en') {
  console.error('English is the source language — nothing to translate.');
  process.exit(1);
}

// ─── Provider implementations ───────────────────────────────────────────────

const PROVIDERS = {
  deepl: async (text, target) => {
    const key = process.env.DEEPL_API_KEY;
    if (!key) throw new Error('DEEPL_API_KEY env var is required for --provider deepl');
    // DeepL Free uses api-free.deepl.com; Pro uses api.deepl.com. Auto-detect:
    const host = key.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
    const res = await fetch(`https://${host}/v2/translate`, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        target_lang: target.toUpperCase(),
        // Preserve formatting (markdown, code, links). DeepL's "tag handling"
        // mode treats angle-bracketed tags as untranslatable; markdown isn't
        // wrapped in tags so it passes through naturally.
        preserve_formatting: true,
      }),
    });
    if (!res.ok) throw new Error(`DeepL error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.translations[0].text;
  },

  openai: async (text, target) => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY env var is required for --provider openai');
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: `You translate vacation-rental guest-guide markdown from English to ${target.toUpperCase()}. ` +
              'Preserve frontmatter keys (only translate `title` and `summary` values). ' +
              'Preserve markdown headings, lists, links, code blocks, emoji, and `[bracketed placeholders]`. ' +
              'Use a friendly, native-sounding tone appropriate for short-stay guests. Output the translated markdown only.',
          },
          { role: 'user', content: text },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.choices[0].message.content.trim();
  },

  anthropic: async (text, target) => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY env var is required for --provider anthropic');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system:
          `You translate vacation-rental guest-guide markdown from English to ${target.toUpperCase()}. ` +
          'Preserve frontmatter keys (only translate `title` and `summary` values). ' +
          'Preserve markdown headings, lists, links, code blocks, emoji, and `[bracketed placeholders]`. ' +
          'Use a friendly, native-sounding tone appropriate for short-stay guests. Output the translated markdown only — no preamble.',
        messages: [{ role: 'user', content: text }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.content[0].text.trim();
  },

  google: async (text, target) => {
    const key = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!key) throw new Error('GOOGLE_TRANSLATE_API_KEY env var is required for --provider google');
    const res = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: 'en',
          target,
          format: 'text',
        }),
      },
    );
    if (!res.ok) throw new Error(`Google Translate error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.data.translations[0].translatedText;
  },
};

const translate = PROVIDERS[provider];
if (!translate) {
  console.error(`Unknown provider: "${provider}". Use one of: ${Object.keys(PROVIDERS).join(', ')}`);
  process.exit(1);
}

// ─── Main ───────────────────────────────────────────────────────────────────

const sourceDir = join(SECTIONS, 'en');
const targetDir = join(SECTIONS, targetLang);

if (!existsSync(sourceDir)) {
  console.error(`Source directory not found: ${sourceDir}`);
  process.exit(1);
}

await mkdir(targetDir, { recursive: true });

const files = (await readdir(sourceDir)).filter((f) => f.endsWith('.md'));
console.log(`Translating ${files.length} files from en → ${targetLang} via ${provider}…`);

let translated = 0;
let skipped = 0;

for (const file of files) {
  const targetPath = join(targetDir, file);
  if (!force && existsSync(targetPath)) {
    skipped++;
    console.log(`  skip  ${file} (already exists, use --force to overwrite)`);
    continue;
  }
  const source = await readFile(join(sourceDir, file), 'utf8');
  process.stdout.write(`  ...   ${file}`);
  try {
    const out = await translate(source, targetLang);
    await writeFile(targetPath, out);
    translated++;
    process.stdout.write(`\r  ✓     ${file}\n`);
  } catch (err) {
    process.stdout.write(`\r  ✗     ${file}\n`);
    console.error(`        ${err.message}`);
  }
}

console.log(`\nDone — translated ${translated}, skipped ${skipped}.`);
console.log(`\nNext steps:`);
console.log(`  1. Add '${targetLang}' to languages in src/i18n/ui.ts`);
console.log(`  2. Add '${targetLang}' to PROPERTY.languages in src/config/property.ts`);
console.log(`  3. Review the generated content in src/content/sections/${targetLang}/`);
console.log(`  4. (Optional) Translate UI strings for ${targetLang} in src/i18n/ui.ts`);
