import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import path from 'path';

// Local SQLite file - use absolute path for Vercel serverless
const dbPath = process.env.DATABASE_URL || `file:${path.resolve(process.cwd(), 'data', 'cdrama.db')}`;
const client = createClient({ url: dbPath });

export const db = drizzle(client, { schema });
