// Your work / projects list. Add, remove, reorder freely.
// `year` shows on the right; `href` is optional (omit for non-linked items).
export interface WorkItem {
  title: string;
  description: string;
  year: string;
  href?: string;
  tag?: string;
}

export const work: WorkItem[] = [
  {
    title: 'This website',
    description: 'A clean, fast personal site built with Astro on Cloudflare Pages.',
    year: '2026',
    href: 'https://github.com/joshcarey',
    tag: 'Astro',
  },
  {
    title: 'Project Two',
    description: 'Short one-line description of what it is and why it’s cool.',
    year: '2025',
    href: '#',
  },
  {
    title: 'Project Three',
    description: 'Another thing you built or contributed to.',
    year: '2024',
  },
];
