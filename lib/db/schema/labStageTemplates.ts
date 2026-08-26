import { cockroachTable as table } from './cockroachTable';
import { text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const labStageTemplates = table('lab_stage_templates', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull(),
  description: text('description'),
  clinicId: text('clinic_id'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type LabStageTemplate = typeof labStageTemplates.$inferSelect;
export type NewLabStageTemplate = typeof labStageTemplates.$inferInsert;
