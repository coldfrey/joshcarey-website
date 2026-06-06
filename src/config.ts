// Edit these in one place — used across the site.
export const SITE = {
  name: 'Joshua Carey',
  title: 'Joshua Carey',
  description: 'Personal site of Joshua Carey — work, writing, and notes.',
  email: 'josh.fwh.carey@gmail.com',
  handle: 'joshuacarey', // terminal user (joshuacarey@web)
  // The avatar lives in /public. Drop your photo at public/profile.jpg.
  // Falls back to the placeholder if missing.
  avatar: '/profile.jpg',
  avatarFallback: '/profile.svg',
};

export const NAV = [
  { href: '/', label: 'Home', cmd: 'cd ~' },
  { href: '/work', label: 'Work', cmd: 'git log' },
  { href: '/blog', label: 'Writing', cmd: 'ls ~/writing' },
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
