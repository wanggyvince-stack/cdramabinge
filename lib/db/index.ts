import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

// Local SQLite file for development
const client = createClient({
  url: process.env.DATABASE_URL || 'file:./data/cdrama.db',
});

export const db = drizzle(client, { schema });
