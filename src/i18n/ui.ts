/**
 * UI strings + language registry.
 *
 * Out of the box we ship full UI translations for EN/DE/HR/IT. Any other
 * language code added to `languages` below will fall back to English for any
 * missing string. Run `node scripts/translate.mjs <lang>` to populate the
 * markdown content for a new language; UI strings need to be added by hand
 * here (about 30 strings — copy the `en` block and translate the values).
 */

export const languages = {
  en: 'English',
  de: 'Deutsch',
  hr: 'Hrvatski',
  it: 'Italiano',
  // Add more languages here. They will fall back to English UI strings until
  // you fill them in below. Common tourism languages:
  // es: 'Español',
  // fr: 'Français',
  // nl: 'Nederlands',
  // pl: 'Polski',
  // cs: 'Čeština',
  // sk: 'Slovenčina',
  // sl: 'Slovenščina',
  // hu: 'Magyar',
  // pt: 'Português',
  // ja: '日本語',
  // zh: '中文',
} as const;

export type Lang = keyof typeof languages;
export const defaultLang: Lang = 'en';

type UiKey =
  | 'site.title'
  | 'site.tagline'
  | 'cat.rules' | 'cat.indulge' | 'cat.tech' | 'cat.stay'
  | 'cat.indulge.sub' | 'cat.tech.sub' | 'cat.stay.sub'
  | 'nav.welcome' | 'nav.wifi' | 'nav.jacuzzi' | 'nav.sauna' | 'nav.coffee'
  | 'nav.grill' | 'nav.tv' | 'nav.oven' | 'nav.rules' | 'nav.checkout'
  | 'nav.explore' | 'nav.evisitor' | 'nav.contact'
  | 'cta.host' | 'cta.emergency'
  | 'common.read_more' | 'common.back' | 'common.important' | 'common.warning'
  | 'lang.label';

type UiDict = Partial<Record<UiKey, string | null>>;

export const ui: Partial<Record<Lang, UiDict>> = {
  en: {
    'site.title': null,
    'site.tagline': 'Guest guide',
    'cat.rules': 'House rules',
    'cat.indulge': 'Indulge',
    'cat.tech': 'Cabin tech',
    'cat.stay': 'Your stay',
    'cat.indulge.sub': 'Hot tub, sauna, grill & TV',
    'cat.tech.sub': 'Appliances & how-to',
    'cat.stay.sub': 'Check-out, area & emergencies',
    'nav.welcome': 'Welcome',
    'nav.wifi': 'Wi-Fi',
    'nav.jacuzzi': 'Hot tub',
    'nav.sauna': 'Sauna',
    'nav.coffee': 'Coffee machine',
    'nav.grill': 'Grill',
    'nav.tv': 'TV',
    'nav.oven': 'Oven',
    'nav.rules': 'House rules',
    'nav.checkout': 'Check-out',
    'nav.explore': 'Explore the area',
    'nav.evisitor': 'Guest registration',
    'nav.contact': 'Contact',
    'cta.host': 'Message host',
    'cta.emergency': 'Emergency (112)',
    'common.read_more': 'Read more',
    'common.back': 'Back',
    'common.important': 'Important',
    'common.warning': 'Warning',
    'lang.label': 'Language',
  },
  de: {
    'site.title': null,
    'site.tagline': 'Gästeführer',
    'cat.rules': 'Hausordnung',
    'cat.indulge': 'Genießen',
    'cat.tech': 'Geräte',
    'cat.stay': 'Ihr Aufenthalt',
    'cat.indulge.sub': 'Whirlpool, Sauna, Grill & TV',
    'cat.tech.sub': 'Geräte & Bedienungsanleitungen',
    'cat.stay.sub': 'Check-out, Umgebung & Notfälle',
    'nav.welcome': 'Willkommen',
    'nav.wifi': 'WLAN',
    'nav.jacuzzi': 'Whirlpool',
    'nav.sauna': 'Sauna',
    'nav.coffee': 'Kaffeemaschine',
    'nav.grill': 'Grill',
    'nav.tv': 'TV',
    'nav.oven': 'Backofen',
    'nav.rules': 'Hausordnung',
    'nav.checkout': 'Check-out',
    'nav.explore': 'Umgebung entdecken',
    'nav.evisitor': 'Gästeanmeldung',
    'nav.contact': 'Kontakt',
    'cta.host': 'Gastgeber:in schreiben',
    'cta.emergency': 'Notruf (112)',
    'common.read_more': 'Mehr lesen',
    'common.back': 'Zurück',
    'common.important': 'Wichtig',
    'common.warning': 'Achtung',
    'lang.label': 'Sprache',
  },
  hr: {
    'site.title': null,
    'site.tagline': 'Vodič za goste',
    'cat.rules': 'Kućni red',
    'cat.indulge': 'Užici',
    'cat.tech': 'Tehnika',
    'cat.stay': 'Vaš boravak',
    'cat.indulge.sub': 'Bazen, sauna, roštilj i TV',
    'cat.tech.sub': 'Aparati i kućanske upute',
    'cat.stay.sub': 'Odjava, okolica i hitni kontakti',
    'nav.welcome': 'Dobrodošli',
    'nav.wifi': 'Wi-Fi',
    'nav.jacuzzi': 'Hidromasažni bazen',
    'nav.sauna': 'Sauna',
    'nav.coffee': 'Aparat za kavu',
    'nav.grill': 'Roštilj',
    'nav.tv': 'TV',
    'nav.oven': 'Pećnica',
    'nav.rules': 'Kućni red',
    'nav.checkout': 'Odjava',
    'nav.explore': 'Istražite okolicu',
    'nav.evisitor': 'Prijava gosta',
    'nav.contact': 'Kontakt',
    'cta.host': 'Pišite domaćinu',
    'cta.emergency': 'Hitno (112)',
    'common.read_more': 'Pročitaj više',
    'common.back': 'Natrag',
    'common.important': 'Važno',
    'common.warning': 'Pažnja',
    'lang.label': 'Jezik',
  },
  it: {
    'site.title': null,
    'site.tagline': 'Guida per gli ospiti',
    'cat.rules': 'Regole della casa',
    'cat.indulge': 'Goditi',
    'cat.tech': 'Apparecchi',
    'cat.stay': 'Il vostro soggiorno',
    'cat.indulge.sub': 'Idromassaggio, sauna, griglia e TV',
    'cat.tech.sub': 'Apparecchi e istruzioni',
    'cat.stay.sub': 'Check-out, dintorni ed emergenze',
    'nav.welcome': 'Benvenuti',
    'nav.wifi': 'Wi-Fi',
    'nav.jacuzzi': 'Idromassaggio',
    'nav.sauna': 'Sauna',
    'nav.coffee': 'Macchina del caffè',
    'nav.grill': 'Griglia',
    'nav.tv': 'TV',
    'nav.oven': 'Forno',
    'nav.rules': 'Regole della casa',
    'nav.checkout': 'Check-out',
    'nav.explore': 'Esplora la zona',
    'nav.evisitor': 'Registrazione ospite',
    'nav.contact': 'Contatti',
    'cta.host': 'Scrivi al padrone di casa',
    'cta.emergency': 'Emergenza (112)',
    'common.read_more': 'Leggi di più',
    'common.back': 'Indietro',
    'common.important': 'Importante',
    'common.warning': 'Attenzione',
    'lang.label': 'Lingua',
  },
};

export function t(lang: Lang, key: UiKey): string {
  const value = ui[lang]?.[key] ?? ui[defaultLang]?.[key];
  return value ?? '';
}

/**
 * Look up a per-component copy map with English fallback. Use this in
 * components that have language-specific prose (Hero, WifiCard, MapPreview…)
 * so adding a new language doesn't require editing every component.
 */
export function withFallback<T>(map: Partial<Record<Lang, T>>, lang: Lang): T {
  return (map[lang] ?? map[defaultLang]) as T;
}
