import { drizzle, LibSQLDatabase } from 'drizzle-orm/libsql';
import { createClient, Client } from '@libsql/client';
import * as schema from './schema';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current file path for ESM modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Local SQLite file - construct absolute path
const dbPath = process.env.DATABASE_URL || `file:${join(__dirname, '../../data/cdrama.db')}`;

let db: LibSQLDatabase<typeof schema>;
try {
  const client: Client = createClient({ url: dbPath });
  db = drizzle(client, { schema });
} catch (error) {
  console.error('Failed to initialize database:', error);
  throw new Error(`Database initialization failed: ${error}`);
}

export { db };
