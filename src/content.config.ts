import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Blog posts live as markdown files in src/content/blog/.
// Add a new .md file, push, redeploy — it appears live automatically.
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
