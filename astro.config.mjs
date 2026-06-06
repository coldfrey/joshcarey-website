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
