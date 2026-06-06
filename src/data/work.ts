// Your work / career timeline.
// LIGHT mode renders this as an elegant editorial timeline.
// DARK mode renders the SAME data as `git log --graph` commit history.
//
// Add newest entries at the TOP (reverse-chronological, like git log).
export interface WorkItem {
  title: string;
  description: string;
  date: string; // ISO-ish, e.g. "2026-06" or "2026"
  range?: string; // human label shown on the timeline, e.g. "2024 — now"
  role?: string;
  href?: string;
  stack?: string[];
  status?: 'active' | 'shipped' | 'archived';
  branch?: string; // git ref decoration, e.g. "main", "labs"
  tag?: string; // git tag decoration, e.g. "v2.0"
  highlights?: string[]; // shown when a commit is expanded (git show)
}

export const work: WorkItem[] = [
  {
    title: 'This website',
    description: 'A dual-personality personal site — Granola-clean by day, amber CRT terminal by night.',
    date: '2026',
    range: '2026 — now',
    role: 'Design & build',
    href: 'https://github.com/coldfrey/joshcarey-website',
    stack: ['Astro', 'TypeScript', 'CSS', 'Cloudflare'],
    status: 'active',
    branch: 'main',
    highlights: [
      'Light = Notion/Granola minimal document; dark = interactive amber terminal',
      'Markdown blog that deploys on push, scroll-driven timeline, animated gallery',
      'Static-first, deployed on Cloudflare Pages via GitHub Actions',
    ],
  },
  {
    title: 'Project Two',
    description: 'Short one-line description of what it is and why it’s interesting.',
    date: '2025',
    range: '2025',
    role: 'Engineer',
    href: '#',
    stack: ['TypeScript', 'React'],
    status: 'shipped',
    tag: 'v1.0',
    highlights: [
      'Replace these with your real wins.',
      'Each bullet shows up under `git show`.',
    ],
  },
  {
    title: 'Project Three',
    description: 'Another thing you built or contributed to.',
    date: '2024',
    range: '2024',
    role: 'Contributor',
    stack: ['Python'],
    status: 'archived',
    branch: 'archive',
    highlights: ['Add detail here.'],
  },
];

// Deterministic fake 7-char commit hash from a string — stable across builds.
export function commitHash(seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0').slice(0, 7);
}
