import { pgTable } from 'drizzle-orm/pg-core';

// CockroachDB uses the same table function as PostgreSQL for Drizzle
// We just alias it for clarity
export const cockroachTable = pgTable;
