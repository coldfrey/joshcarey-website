// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Update this to your custom domain once DNS is pointed at Cloudflare Pages.
const SITE = 'https://joshcarey.dev';

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
