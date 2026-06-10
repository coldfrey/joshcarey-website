// Public base URL for gallery media hosted on Cloudflare R2 (bucket
// `joshuacarey-gallery`). Originals live in media-src/ and are pushed to R2 by
// the pre-commit hook; reference them as `${MEDIA_BASE}/<filename>`.
// TODO: swap to https://media.joshuacarey.org once the R2 custom domain is added.
export const MEDIA_BASE = 'https://pub-9ec0054b913c4c4f9b29a27db73c9539.r2.dev';

// Edit these in one place — used across the site.
export const SITE = {
  name: 'Joshua Carey',
  title: 'Joshua Carey',
  description: 'Personal site of Joshua Carey: work, writing, and notes.',
  email: 'josh.fwh.carey@gmail.com',
  handle: 'joshuacarey', // terminal user (joshuacarey@web)
  // The avatar lives in /public. Drop your photo at public/profile.jpg.
  // Falls back to the placeholder if missing.
  avatar: '/profile.jpg',
  avatarFallback: '/profile.svg',
};

export const NAV = [
  { href: '/', label: 'Home', cmd: 'cd ~' },
  { href: '/timeline', label: 'Timeline', cmd: 'git log' },
  { href: '/writing', label: 'Writing', cmd: 'ls ~/writing' },
  { href: '/gallery', label: 'Gallery', cmd: 'open ~/gallery' },
];

// Add / remove freely. Order is preserved.
export const SOCIALS = [
  { label: 'Email', cmd: 'mail', href: 'mailto:josh.fwh.carey@gmail.com' },
  { label: 'GitHub', cmd: 'github', href: 'https://github.com/coldfrey' },
  { label: 'X', cmd: 'x', href: 'https://x.com/joshuacarey_' },
  {
    label: 'LinkedIn',
    cmd: 'linkedin',
    href: 'https://www.linkedin.com/in/joshua-carey-5156a51aa/',
  },
];
