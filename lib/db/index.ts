import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import path from 'path';

// Local SQLite file - use absolute path for Vercel serverless
const dbPath = process.env.DATABASE_URL || `file:${path.resolve(process.cwd(), 'data', 'cdrama.db')}`;
const client = createClient({ url: dbPath });

// Set journal mode to memory for read-only filesystem (Vercel serverless)
// Use @ts-ignore because executeSync may not exist in all @libsql/client versions
// Wrapped in try/catch to prevent build hangs
try {
  // @ts-ignore - executeSync may not exist in type definitions
  if (typeof client.executeSync === 'function') {
    client.executeSync('PRAGMA journal_mode=MEMORY');
  } else {
    client.execute('PRAGMA journal_mode=MEMORY').catch(() => {});
  }
} catch {
  // Silently ignore
}

export const db = drizzle(client, { schema });
