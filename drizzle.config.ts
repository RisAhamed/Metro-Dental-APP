import { defineConfig } from 'drizzle-kit';
import { loadEnvFile } from 'node:process';

loadEnvFile('.env.local');

export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/db/schema/*.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
  migrations: {
    table: 'drizzle_migrations',
  },
});
