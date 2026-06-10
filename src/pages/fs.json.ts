// Build-time virtual filesystem for the interactive terminal.
// Generated from the site's real content (work, blog, gallery) so the shell
// always reflects what's actually on the site. Served as static /fs.json.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { work, commitHash, commitType, branchRef, slugify } from '../data/work';
import { gallery } from '../data/gallery';
import { MEDIA_BASE, SITE, SOCIALS } from '../config';

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

  const about = `joshua carey
engineer · founder · ex-GBR athlete

now      AI @ Cecil Wright & Partners
before   founding engineer @ SAMMY Labs (YC W25)

try: ls · git log · gallery · help`;

  const contact = SOCIALS.map((s) => `${s.label.padEnd(10)} ${s.href}`).join('\n');

  const workChildren: Record<string, FsNode> = {};
  for (const item of work) {
    const links = [
      ...(item.href ? [{ label: 'site', href: item.href }] : []),
      ...(item.links ?? []).filter((l) => l.href !== item.href),
    ];
    workChildren[`${slugify(item.title)}.md`] = {
      type: 'file',
      href: item.href ?? item.links?.[0]?.href,
      meta: item.date,
      content:
        `# ${item.title}  (${commitHash(item.title + item.date)})\n` +
        `${item.role ? item.role + ' · ' : ''}${item.range ?? item.date}\n\n` +
        `${item.description}\n` +
        (item.highlights?.length ? '\n' + item.highlights.map((h) => `  + ${h}`).join('\n') : '') +
        (item.stack?.length ? `\n\nstack: ${item.stack.join(', ')}` : '') +
        (links.length ? '\n\n' + links.map((l) => `→ ${l.label}: ${l.href}`).join('\n') : ''),
    };
  }

  const blogChildren: Record<string, FsNode> = {};
  for (const p of posts) {
    // Include the real post body so `cat <post>.md` reads the whole thing in the
    // terminal (raw markdown — it IS a .md file), not just the description.
    // `media:` image shorthands resolve to public R2 URLs so the terminal's
    // linkifier makes them clickable.
    const body = ((p.body ?? '').trim() || (p.data.description ?? '')).replaceAll(
      '](media:',
      `](${MEDIA_BASE}/`,
    );
    blogChildren[`${p.id}.md`] = {
      type: 'file',
      href: `/writing/${p.id}/`,
      meta: p.data.date.toISOString().slice(0, 10),
      content: `# ${p.data.title}\n${p.data.date.toISOString().slice(0, 10)}\n\n${body}\n\n→ /writing/${p.id}/`,
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
      timeline: { type: 'dir', href: '/timeline', children: workChildren },
      writing: { type: 'dir', href: '/writing', children: blogChildren },
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
            content: 'nice try 😄 - no private keys here.',
          },
        },
      },
    },
  };

  // commit log for the `git log --graph` command
  const commits = work.map((item) => {
    const branch = branchRef(item);
    return {
      hash: commitHash(item.title + item.date),
      title: item.title,
      date: item.date,
      range: item.range ?? item.date,
      role: item.role ?? '',
      type: commitType(item),
      refs: [
        ...(item.status === 'active' && (item.kind ?? 'work') === 'work' ? ['HEAD -> main'] : []),
        ...(branch ? [branch] : []),
        ...(item.tag ? [`tag: ${item.tag}`] : []),
      ],
      desc: item.description,
      stack: item.stack ?? [],
      highlights: item.highlights ?? [],
      href: item.href ?? '',
      links: [
        ...(item.href ? [{ label: 'site', href: item.href }] : []),
        ...(item.links ?? []).filter((l) => l.href !== item.href),
      ],
    };
  });

  return new Response(JSON.stringify({ ...root, commits }), {
    headers: { 'content-type': 'application/json' },
  });
};
