// Career + projects timeline. LIGHT = two-lane editorial timeline
// (work/education left, projects & life right), DARK = `git log`.
// Newest first. Keep descriptions terse — one line, no essays.
export type ItemKind = 'work' | 'education' | 'project' | 'life';

export interface WorkLink {
  label: string;
  href: string; // external (https://…) or internal (/blog/…, /gallery)
}

export interface WorkItem {
  title: string;
  description: string;
  date: string; // big year numeral (use the most recent / end year)
  range?: string; // span label, e.g. "2024 — 2025"
  role?: string;
  href?: string;
  links?: WorkLink[];
  kind?: ItemKind; // default 'work'
  pair?: boolean; // render level with the previous entry (must be on the opposite side)
  stack?: string[];
  status?: 'active' | 'shipped' | 'archived';
  branch?: string;
  tag?: string;
  highlights?: string[];
}

export const work: WorkItem[] = [
  {
    title: 'joshuacarey.org',
    kind: 'project',
    description: 'This Site',
    date: '2026',
    range: '2026 - now',
    status: 'active',
    links: [{ label: 'github', href: 'https://github.com/coldfrey/joshcarey-website' }],
    stack: ['Astro', 'TypeScript', 'Cloudflare'],
  },
  {
    title: 'Magic Skyweed',
    kind: 'project',
    description: 'Paragliding weather and flight planning, personalised to your wing.',
    date: '2026',
    range: 'Mar 2026 - now',
    status: 'active',
    href: 'https://magicskyweed.com',
    stack: ['React', 'TypeScript', 'Cloudflare', 'Open-Meteo'],
  },
  {
    title: 'Cecil Wright & Partners',
    role: 'AI & Digital Transformation',
    description: 'AI and digital transformation at a boutique superyacht brokerage.',
    date: '2025',
    range: '2025 - now',
    status: 'active',
    branch: 'main',
    href: 'https://www.cecilwright.com',
    stack: ['AI', 'TypeScript', 'Python'],
  },
  {
    // TODO(josh): confirm date
    title: 'WhatsApp Agents',
    kind: 'project',
    description: 'Generic WhatsApp AI agents hosted on Cloudflare Durable Objects.',
    date: '2025',
    range: '2025',
    status: 'shipped',
    links: [{ label: 'github', href: 'https://github.com/coldfrey/whatsapp-cloudflare-agent' }],
    stack: ['TypeScript', 'Cloudflare', 'Durable Objects'],
  },
  {
    title: 'SAMMY Labs',
    role: 'Founding Engineer',
    description: 'First hire. Built AI agents & LLM apps; scaled the team 1→6 on a $2.7M seed.',
    date: '2025',
    range: '2024 - 2025',
    status: 'shipped',
    tag: 'YC W25',
    href: 'https://www.sammylabs.com',
    stack: ['Python', 'TypeScript', 'LLMs', 'GCP'],
  },
  {
    title: 'Magic AI Workouts',
    kind: 'project',
    description: 'Workout tracking app built for a Magic AI tech challenge.',
    date: '2024',
    range: 'Oct 2024',
    status: 'shipped',
    links: [{ label: 'github', href: 'https://github.com/coldfrey/magic_ai_workouts' }],
    stack: ['Flutter', 'GetX', 'Firestore'],
  },
  {
    title: 'Captain App',
    role: 'Co-Founder',
    description: 'Co-founded a full-stack software consultancy.',
    date: '2024',
    range: '2021 - 2024',
    status: 'shipped',
    href: 'https://captainapp.co.uk',
    stack: ['Flutter', 'GCP', 'AWS'],
  },
  {
    title: 'Glamox',
    role: 'Dart + Cloud Developer',
    description: 'BLE commissioning app for a commercial lighting system.',
    date: '2024',
    range: '2023 - 2024',
    status: 'shipped',
    branch: 'contract',
    stack: ['Flutter', 'Firebase', 'BLE'],
  },
  {
    // TODO(josh): add images when ready
    title: 'Pirate Life',
    kind: 'life',
    description: 'Buying, restoring and sailing a 1963 wooden sailing boat.',
    date: '2023',
    range: '2023 - 2024',
    status: 'shipped',
    links: [{ label: 'Thoughts', href: 'https://www.joshuacarey.org/writing/a-sinking-ship/' }],
  },
  {
    title: 'Kitefoil Portland → Southampton',
    kind: 'life',
    description:
      'Kitefoil passage along the south coast, Portland Harbour to Southampton. 113km in 2h 53min.',
    date: '2023',
    range: '2023',
    status: 'shipped',
    links: [
      {
        label: 'View',
        href: 'https://www.linkedin.com/posts/joshua-carey-5156a51aa_sailing-kitesurfing-adventure-activity-7088849770122747904-4cjW',
      },
    ],
  },
  {
    title: 'Learning to Fly',
    kind: 'life',
    description: 'Taught myself to paraglide.',
    date: '2023',
    range: '2023',
    status: 'shipped',
  },
  {
    // TODO(josh): confirm date; add photos when ready
    title: 'Honda C90 rebuild',
    kind: 'life',
    description: 'Stripped and rebuilt a Honda C90 - engine out, every bolt accounted for.',
    date: '2023',
    range: '2023',
    status: 'shipped',
  },
  {
    title: 'Masters Thesis',
    kind: 'project',
    description: 'RL control for an autonomous kite-powered vessel.',
    date: '2023',
    range: '2023',
    status: 'archived',
    links: [{ label: 'github', href: 'https://github.com/coldfrey/Autonomous-Vessel-Control' }],
    stack: ['Python', 'RL'],
  },
  {
    title: 'MSc Computer Science',
    kind: 'education',
    role: 'University of Bristol',
    description: 'Thesis: RL for autonomous kite-powered vessel control.',
    date: '2023',
    range: 'MSc · 2022 - 2023',
    status: 'archived',
    branch: 'edu',
    pair: true, // same thing as the Masters Thesis project - sit level with it
  },
  {
    title: 'Uncommon',
    role: 'Full-Stack Developer',
    description: 'E-commerce site + admin dashboard.',
    date: '2023',
    range: '2022 - 2023',
    status: 'shipped',
    branch: 'contract',
    stack: ['Next.js', 'Sanity', 'AWS'],
  },
  {
    title: 'BEng Mechanical Engineering',
    kind: 'education',
    role: 'University of Bristol · 1st Class',
    description: 'First-class honours.',
    date: '2022',
    range: 'BEng · 2019 - 2022',
    status: 'archived',
    branch: 'edu',
  },
  {
    title: 'Lite IP',
    role: 'Full-Stack & Product',
    description: 'IoT add-on for commercial lighting, installed at PwC.',
    date: '2021',
    range: '2020 - 2021',
    status: 'archived',
    branch: 'contract',
    stack: ['C', 'SwiftUI', 'React', 'ESP32'],
  },
  {
    title: 'Ineos Acetyls',
    role: 'Mechanical Engineering Intern',
    description: 'Reformer temperature-monitoring analysis.',
    date: '2021',
    range: 'Summer 2021',
    status: 'archived',
  },
  {
    title: 'Team GBR',
    kind: 'life',
    role: 'International Athlete · Windsurf & Kitefoil',
    description: 'Raced for Great Britain. National Champion; 3rd at Europeans.',
    date: '2021',
    range: '2012 - 2021',
    status: 'archived',
  },
];

// 'left' = professional spine (work/education), 'right' = projects & life.
export function side(item: WorkItem): 'left' | 'right' {
  const kind = item.kind ?? 'work';
  return kind === 'project' || kind === 'life' ? 'right' : 'left';
}

// Conventional-commit type for the dark git log.
export function commitType(item: WorkItem): string {
  const kind = item.kind ?? 'work';
  if (kind === 'project') return 'proj';
  if (kind === 'life') return 'life';
  return item.status === 'archived' ? 'chore' : 'feat';
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Branch decoration: explicit branch wins; projects & life get proj/<slug>, life/<slug>.
export function branchRef(item: WorkItem): string | undefined {
  if (item.branch && item.branch !== 'main') return item.branch;
  const kind = item.kind ?? 'work';
  if (kind === 'project') return `proj/${slugify(item.title)}`;
  if (kind === 'life') return `life/${slugify(item.title)}`;
  return undefined;
}

// Deterministic fake 7-char commit hash from a string — stable across builds.
export function commitHash(seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0').slice(0, 7);
}
