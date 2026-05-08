import { languages, defaultLang, type Lang } from './ui';

export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split('/');
  if (lang in languages) return lang as Lang;
  return defaultLang;
}

export function localizedPath(lang: Lang, path: string = ''): string {
  const clean = path.replace(/^\/+/, '');
  return `/${lang}${clean ? '/' + clean : ''}`;
}

export function pickLangFromAcceptLanguage(header: string | null): Lang {
  if (!header) return defaultLang;
  const tags = header
    .split(',')
    .map((p) => {
      const [tag, q = 'q=1'] = p.trim().split(';');
      const quality = parseFloat(q.split('=')[1] ?? '1');
      return { tag: tag.toLowerCase().split('-')[0], quality };
    })
    .sort((a, b) => b.quality - a.quality);
  for (const { tag } of tags) {
    if (tag in languages) return tag as Lang;
  }
  return defaultLang;
}
