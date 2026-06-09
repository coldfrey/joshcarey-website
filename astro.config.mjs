// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Custom domain (Cloudflare Registrar + Pages). Drives sitemap, canonical URLs,
// and absolute OG/JSON-LD links — keep it in sync with the live domain.
const SITE = 'https://joshuacarey.org';

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
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      wrap: true,
    },
  },
});
