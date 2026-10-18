/**
 * Give every markdown <img> from /public its real width/height so the browser
 * reserves the space before the file arrives. Without it, section pages jumped
 * as photos loaded (measured: layout shift up to 0.36 on a photo-heavy page at 360 px).
 * CSS keeps them fluid (width: 100%; height: auto). Images after the first are
 * lazy-loaded.
 */
import { visit } from 'unist-util-visit';
import sharp from 'sharp';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const cache = new Map();

export default function rehypeImageSize({ publicDir = 'public' } = {}) {
  return async (tree) => {
    const imgs = [];
    visit(tree, 'element', (node) => {
      if (node.tagName === 'img' && typeof node.properties?.src === 'string' && node.properties.src.startsWith('/')) imgs.push(node);
    });
    let first = true;
    for (const node of imgs) {
      const file = join(publicDir, decodeURI(node.properties.src));
      if (existsSync(file)) {
        if (!cache.has(file)) cache.set(file, await sharp(file).metadata());
        const { width, height } = cache.get(file);
        if (width && height && node.properties.width == null) {
          node.properties.width = width;
          node.properties.height = height;
        }
      }
      node.properties.decoding = 'async';
      if (!first) node.properties.loading = 'lazy';
      first = false;
    }
  };
}
