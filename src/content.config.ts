import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

export const categories = ['rules', 'indulge', 'tech', 'stay'] as const;
export type Category = (typeof categories)[number];

const sections = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/sections' }),
  schema: z.object({
    title: z.string(),
    icon: z.string(),
    order: z.number(),
    category: z.enum(categories).optional(),
    summary: z.string().optional(),
    safetyCritical: z.boolean().default(false),
  }),
});

export const collections = { sections };
