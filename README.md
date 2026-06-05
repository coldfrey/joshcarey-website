# joshcarey-website

A clean, fast personal site — **home**, **work**, and a markdown **blog** — built
with [Astro](https://astro.build) and hosted on Cloudflare Pages.

## Develop

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # output to ./dist
npm run preview  # preview the production build
```

## Write a blog post

Posts are just markdown files — **add one, push, and it goes live on the next deploy.**

1. Create `src/content/blog/my-post.md`
2. Add frontmatter at the top:

   ```md
   ---
   title: My post title
   description: One-line summary (optional — shows in the list + RSS).
   date: 2026-06-05
   # updated: 2026-06-10   # optional
   # draft: true           # optional — hidden in prod, visible in `npm run dev`
   ---

   Your markdown here…
   ```

3. The filename is the URL slug → `my-post.md` serves at `/blog/my-post/`.

## Customise

- **Name, tagline, socials, avatar** → `src/config.ts`
- **Home intro copy** → `src/pages/index.astro`
- **Work / projects list** → `src/data/work.ts`
- **Colors & type** → CSS variables at the top of `src/styles/global.css`
- **Profile photo** → replace `public/profile.svg` (e.g. add `public/profile.jpg`)
  and update `avatar` in `src/config.ts`
- **Favicon** → replace `public/favicon.svg`
- **Custom domain** → update `site` in `astro.config.mjs`

## Deploy to Cloudflare Pages (CI/CD on push to main)

This repo deploys via GitHub Actions (`.github/workflows/deploy.yml`): every push
to `main` builds the site and runs `wrangler pages deploy`. So adding a blog `.md`
and pushing is all it takes to go live.

**One-time setup** — add two repo secrets so CI can authenticate to Cloudflare:

1. Create a Cloudflare API token with the **Cloudflare Pages → Edit** permission
   (Dashboard → My Profile → API Tokens), and grab your **Account ID**
   (Dashboard → Workers & Pages → Account details).
2. Add them as GitHub Actions secrets:

   ```bash
   gh secret set CLOUDFLARE_API_TOKEN
   gh secret set CLOUDFLARE_ACCOUNT_ID
   ```

That's it — the next push to `main` provisions the `joshcarey-website` Pages
project (if needed) and deploys. The live URL is
`https://joshcarey-website.pages.dev` (custom domain is wired up separately in
the Cloudflare dashboard).

**Manual deploy from your machine (optional):**

```bash
npx wrangler login   # one-time browser auth
npm run deploy       # builds + uploads ./dist
```
