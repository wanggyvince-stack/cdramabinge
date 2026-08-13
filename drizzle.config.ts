import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  driver: 'turso',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'file:./data/cdrama.db',
  },
});
