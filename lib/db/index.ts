import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import path from 'path';

const dbPath = process.env.DATABASE_URL || `file:${path.resolve(process.cwd(), 'data', 'cdrama.db')}`;
const client = createClient({ url: dbPath });

client.execute('PRAGMA journal_mode=MEMORY').catch(() => {});

export const db = drizzle(client, { schema });
