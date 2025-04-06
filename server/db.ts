import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { log } from './vite';

// Get database connection string from environment variables
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  log('DATABASE_URL environment variable is not set', 'db');
  process.exit(1);
}

// Create postgres connection
const client = postgres(DATABASE_URL);

// Create drizzle instance
export const db = drizzle(client);

// Log successful database connection
log('Connected to PostgreSQL database', 'db');