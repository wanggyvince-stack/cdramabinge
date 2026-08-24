import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import path from 'path';

const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

const client = isBuildTime
  ? createClient({ url: ':memory:' })
  : createClient({ url: process.env.DATABASE_URL || `file:${path.resolve(process.cwd(), 'data', 'cdrama.db')}` });

if (!isBuildTime) {
  client.execute('PRAGMA journal_mode=MEMORY').catch(() => {});
}

export const db = drizzle(client, { schema });