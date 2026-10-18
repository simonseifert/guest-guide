import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import GithubSlugger from 'github-slugger';
import { PROPERTY } from '../../config/property';

/**
 * Search index for one language: every section split at its ## / ### headings,
 * as plain text. Built at deploy time and precached by the service worker, so the
 * header search works offline too. Anchors use the same slugger Astro uses for
 * heading ids, so a result jumps straight to its heading.
 */
export async function getStaticPaths() {
  return PROPERTY.languages.map((lang) => ({ params: { lang } }));
}

const plain = (md: string) =>
  md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links -> their text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\*+|`/g, '') // emphasis/code marks (single _ stays: My_Cabin_WiFi)
    .replace(/[>#|]/g, ' ')
    .replace(/^\s*[-+]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .replace(/ ([,.;:!?)])/g, '$1')
    .trim();

export const GET: APIRoute = async ({ params }) => {
  const lang = params.lang as string;
  const sections = (await getCollection('sections')).filter((s) => s.id.startsWith(`${lang}/`));
  const items: { s: string; t: string; i: string; h: string; a: string; x: string }[] = [];

  for (const entry of sections) {
    const slug = entry.id.split('/')[1];
    const slugger = new GithubSlugger();
    const base = { s: slug, t: entry.data.title, i: entry.data.icon };
    let heading = '';
    let anchor = '';
    let buf: string[] = [entry.data.summary ?? ''];
    const flush = () => {
      const x = plain(buf.join('\n'));
      if (x || heading) items.push({ ...base, h: heading, a: anchor, x });
      buf = [];
    };
    for (const line of (entry.body ?? '').split('\n')) {
      const m = line.match(/^(#{2,3})\s+(.+)$/);
      if (m) {
        flush();
        heading = plain(m[2]);
        anchor = slugger.slug(m[2].replace(/\*+|`/g, '').trim());
      } else {
        buf.push(line);
      }
    }
    flush();
  }

  return new Response(JSON.stringify(items), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
