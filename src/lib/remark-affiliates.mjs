/**
 * Custom remark plugin: rewrite affiliate-shorthand markdown links into proper
 * partner-attributed links.
 *
 * Hosts write ordinary markdown links with a `provider:` URL prefix:
 *
 *   - [Skip-the-line](viator:https://viator.com/d479-12345)
 *   - [Louvre tour](gyg:https://getyourguide.com/paris-l16/abc-12345)
 *   - [Hotel near you](booking:https://booking.com/hotel/foo.html)
 *   - [Travel adapter](amazon:https://amazon.com/dp/B07XYZ)
 *
 * The plugin visits every link node, detects the `provider:` prefix, strips
 * it, appends the matching partner-ID query parameter from
 * `src/config/property.ts → affiliates`, and sets `target="_blank"
 * rel="sponsored noopener"` (Google requires `sponsored` for paid links).
 *
 * Disabled providers (empty partner ID) gracefully degrade to plain external
 * links — `rel="noopener"` only.
 *
 * `gyg` is an alias for `getYourGuide`.
 */

import { visit } from 'unist-util-visit';

const SUPPORTED = ['viator', 'getYourGuide', 'gyg', 'booking', 'amazon'];

const ALIASES = {
  gyg: 'getYourGuide',
};

const TRANSFORMERS = {
  viator: (url, id) => addParam(url, 'pid', id),
  getYourGuide: (url, id) => addParam(url, 'partner_id', id),
  booking: (url, id) => addParam(url, 'aid', id),
  amazon: (url, id) => addParam(url, 'tag', id),
};

function addParam(url, key, value) {
  if (!value) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${key}=${encodeURIComponent(value)}`;
}

/**
 * @param {{ affiliates?: Record<string, string> }} options
 */
export function remarkAffiliates(options = {}) {
  const partnerIds = options.affiliates ?? {};

  return (tree) => {
    visit(tree, 'link', (node) => {
      const url = node.url ?? '';
      // Match `provider:https://…` or `provider:http://…`.
      const m = url.match(/^([a-z][a-zA-Z]*):(https?:\/\/.+)$/);
      if (!m) return;
      const providerRaw = m[1];
      if (!SUPPORTED.includes(providerRaw)) return;
      const provider = ALIASES[providerRaw] ?? providerRaw;
      const innerUrl = m[2];
      const partnerId = partnerIds[provider];
      const transform = TRANSFORMERS[provider];
      const isAffiliate = Boolean(partnerId && transform);
      const finalUrl = isAffiliate ? transform(innerUrl, partnerId) : innerUrl;
      node.url = finalUrl;
      node.data = node.data ?? {};
      node.data.hProperties = {
        ...(node.data.hProperties ?? {}),
        target: '_blank',
        rel: isAffiliate ? 'sponsored noopener' : 'noopener',
      };
    });
  };
}
