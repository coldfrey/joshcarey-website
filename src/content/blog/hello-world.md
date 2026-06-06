---
title: Hello, world
description: The first post on my new site — and how the writing here works.
date: 2026-06-05
---

Welcome. This is the first post on my new site.

Writing here is intentionally low-friction: every post is just a markdown file
in the repo. I add a new `.md` file, push it, and on the next deploy it shows up
live — no CMS, no database, nothing to babysit.

## How posts work

Each post lives in `src/content/blog/` and starts with a little frontmatter:

```md
---
title: My post title
description: A one-line summary (optional, shows in the list + RSS).
date: 2026-06-05
---

Your content here…
```

That's it. The filename becomes the URL slug, so `my-first-idea.md` is served at
`/blog/my-first-idea/`.

## What you can write

Standard markdown all works — **bold**, _italic_, [links](https://astro.build),
lists, quotes, and code with syntax highlighting:

```ts
function greet(name: string) {
  return `Hey, ${name} 👋`;
}
```

> Keep it simple. Ship often.

More soon.
