import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import path from 'path';

// Local SQLite file - use absolute path for Vercel serverless
const dbPath = process.env.DATABASE_URL || `file:${path.resolve(process.cwd(), 'data', 'cdrama.db')}`;
const client = createClient({ url: dbPath });

// Set journal mode to memory for read-only filesystem (Vercel serverless)
// This prevents SQLite from trying to create WAL/journal files
// Wrapped in try/catch to prevent build hangs if PRAGMA fails on certain DB files
try {
  client.executeSync('PRAGMA journal_mode=MEMORY');
} catch {
  // Silently ignore - DB will work fine without this pragma
}

export const db = drizzle(client, { schema });