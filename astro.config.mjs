// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { MEDIA_BASE } from './src/config.ts';

// Custom domain (Cloudflare Registrar + Pages). Drives sitemap, canonical URLs,
// and absolute OG/JSON-LD links — keep it in sync with the live domain.
const SITE = 'https://joshuacarey.org';

// Resolve `media:<file>` image URLs in markdown to the R2 media bucket, so
// writing pieces use the same image pipeline as the gallery: drop the file in
// media-src/ (synced to R2 on commit, or `npm run media:sync`) and write
// ![alt text](media:my-photo.jpg). Also lazy-loads every markdown image.
function remarkMediaImages() {
  /** @param {any} node @param {(n: any) => void} fn */
  const walk = (node, fn) => {
    fn(node);
    for (const child of node.children ?? []) walk(child, fn);
  };
  return (/** @type {any} */ tree) => {
    walk(tree, (node) => {
      if (node.type !== 'image') return;
      if (node.url?.startsWith('media:')) {
        node.url = `${MEDIA_BASE}/${node.url.slice('media:'.length)}`;
      }
      node.data = {
        ...node.data,
        hProperties: {
          .../** @type {any} */ (node.data)?.hProperties,
          loading: 'lazy',
          decoding: 'async',
        },
      };
    });
  };
}

// https://astro.build/config
export default defineConfig({
  site: SITE,
  integrations: [sitemap()],
  // Prefetch in-viewport links (the nav is always on-screen) so the next page
  // is already cached by the time you click it. Without this, ClientRouter only
  // prefetches on hover — useless on a mobile tap — so every nav click waited on
  // a full network round trip before the crossfade could even start.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  markdown: {
    remarkPlugins: [remarkMediaImages],
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      wrap: true,
    },
  },
});
