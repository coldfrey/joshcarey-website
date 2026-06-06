// Career timeline. LIGHT = editorial timeline, DARK = `git log --graph`.
// Newest first. Keep descriptions terse — one line, no essays.
export interface WorkItem {
  title: string;
  description: string;
  date: string; // big year numeral (use the most recent / end year)
  range?: string; // span label, e.g. "2024 — 2025"
  role?: string;
  href?: string;
  stack?: string[];
  status?: 'active' | 'shipped' | 'archived';
  branch?: string;
  tag?: string;
  highlights?: string[];
}

export const work: WorkItem[] = [
  {
    title: 'Cecil Wright & Partners',
    role: 'AI & Digital Transformation',
    description: 'AI and digital transformation at a boutique superyacht brokerage.',
    date: '2025',
    range: '2025 — now',
    status: 'active',
    branch: 'main',
    href: 'https://www.cecilwright.com',
    stack: ['AI', 'TypeScript', 'Python'],
  },
  {
    title: 'SAMMY Labs',
    role: 'Founding Engineer',
    description: 'First hire — built AI agents & LLM apps; scaled the team 1→6 on a $2.7M seed.',
    date: '2025',
    range: '2024 — 2025',
    status: 'shipped',
    tag: 'YC W25',
    href: 'https://www.sammylabs.com',
    stack: ['Python', 'TypeScript', 'LLMs', 'GCP'],
  },
  {
    title: 'Captain App',
    role: 'Co-Founder',
    description: 'Co-founded a full-stack software consultancy.',
    date: '2024',
    range: '2021 — 2024',
    status: 'shipped',
    href: 'https://captainapp.co.uk',
    stack: ['Flutter', 'GCP', 'AWS'],
  },
  {
    title: 'Glamox',
    role: 'Dart + Cloud Developer',
    description: 'BLE commissioning app for a commercial lighting system.',
    date: '2024',
    range: '2023 — 2024',
    status: 'shipped',
    branch: 'contract',
    stack: ['Flutter', 'Firebase', 'BLE'],
  },
  {
    title: 'MSc Computer Science',
    role: 'University of Bristol',
    description: 'Thesis: RL for autonomous kite-powered vessel control.',
    date: '2023',
    range: 'MSc · 2023',
    status: 'archived',
    branch: 'edu',
  },
  {
    title: 'Uncommon',
    role: 'Full-Stack Developer',
    description: 'E-commerce site + admin dashboard.',
    date: '2023',
    range: '2022 — 2023',
    status: 'shipped',
    branch: 'contract',
    stack: ['Next.js', 'Sanity', 'AWS'],
  },
  {
    title: 'BEng Mechanical Engineering',
    role: 'University of Bristol — 1st Class',
    description: 'First-class honours.',
    date: '2022',
    range: 'BEng · 2022',
    status: 'archived',
    branch: 'edu',
  },
  {
    title: 'Lite IP',
    role: 'Full-Stack & Product',
    description: 'IoT add-on for commercial lighting — installed at PwC.',
    date: '2021',
    range: '2020 — 2021',
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
    role: 'International Athlete — Windsurf & Kitefoil',
    description: 'Raced for Great Britain. National Champion; 3rd at Europeans.',
    date: '2021',
    range: '2012 — 2021',
    status: 'archived',
    branch: 'athlete',
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
