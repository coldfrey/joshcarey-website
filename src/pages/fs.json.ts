// Build-time virtual filesystem for the interactive terminal.
// Generated from the site's real content (work, blog, gallery) so the shell
// always reflects what's actually on the site. Served as static /fs.json.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { work, commitHash } from '../data/work';
import { gallery } from '../data/gallery';
import { SITE, SOCIALS } from '../config';

export const prerender = true;

interface FsNode {
  type: 'dir' | 'file';
  href?: string;
  content?: string;
  meta?: string;
  hidden?: boolean;
  img?: {
    src: string;
    w: number;
    h: number;
    size: string;
    date: string;
    title: string;
    location?: string;
  };
  children?: Record<string, FsNode>;
}

export const GET: APIRoute = async () => {
  const posts = (await getCollection('blog'))
    .filter((p) => !p.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const about = `${SITE.name} — software engineer.

I build clean, useful things for the web, and occasionally write about them.
This site has two faces: a calm Notion/Granola-style document by day, and the
amber terminal you're reading now by night.

Type \`help\` to look around. Try: ls, cat about.txt, cd work, gallery, snake.`;

  const contact = SOCIALS.map((s) => `${s.label.padEnd(10)} ${s.href}`).join('\n');

  const workChildren: Record<string, FsNode> = {};
  for (const item of work) {
    const slug = item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    workChildren[`${slug}.md`] = {
      type: 'file',
      href: item.href,
      meta: item.date,
      content:
        `# ${item.title}  (${commitHash(item.title + item.date)})\n` +
        `${item.role ? item.role + ' · ' : ''}${item.range ?? item.date}\n\n` +
        `${item.description}\n` +
        (item.highlights?.length ? '\n' + item.highlights.map((h) => `  + ${h}`).join('\n') : '') +
        (item.stack?.length ? `\n\nstack: ${item.stack.join(', ')}` : '') +
        (item.href ? `\n\n→ ${item.href}` : ''),
    };
  }

  const blogChildren: Record<string, FsNode> = {};
  for (const p of posts) {
    blogChildren[`${p.id}.md`] = {
      type: 'file',
      href: `/blog/${p.id}/`,
      meta: p.data.date.toISOString().slice(0, 10),
      content: `# ${p.data.title}\n${p.data.date.toISOString().slice(0, 10)}\n\n${p.data.description ?? ''}\n\n→ /blog/${p.id}/`,
    };
  }

  const galleryChildren: Record<string, FsNode> = {};
  for (const g of gallery) {
    galleryChildren[g.file] = {
      type: 'file',
      href: g.src,
      meta: `${g.size}  ${g.date}`,
      img: {
        src: g.src,
        w: g.w,
        h: g.h,
        size: g.size,
        date: g.date,
        title: g.title,
        location: g.location,
      },
      content: `${g.title}\n${g.w}×${g.h} · ${g.size} · ${g.date}${g.location ? ' · ' + g.location : ''}\n\n→ ${g.src}`,
    };
  }

  const root: FsNode = {
    type: 'dir',
    children: {
      'about.txt': { type: 'file', content: about },
      'contact.txt': { type: 'file', content: contact },
      work: { type: 'dir', href: '/work', children: workChildren },
      blog: { type: 'dir', href: '/blog', children: blogChildren },
      gallery: { type: 'dir', href: '/gallery', children: galleryChildren },
      '.secret': {
        type: 'file',
        hidden: true,
        content:
          "you found a hidden file. the cake is a lie.\n\ntry: sudo, vim, sl, snake, theme light, neofetch",
      },
      '.ssh': {
        type: 'dir',
        hidden: true,
        children: {
          id_rsa: {
            type: 'file',
            content: 'nice try 😄 — no private keys here.',
          },
        },
      },
    },
  };

  return new Response(JSON.stringify(root), {
    headers: { 'content-type': 'application/json' },
  });
};
