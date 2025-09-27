import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { UserTable } from './users.schema';

export const RefreshTokenTable = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    token: text('token').notNull().unique(),
    userId: uuid('user_id')
      .notNull()
      .references(() => UserTable.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at').notNull(),
    isRevoked: text('is_revoked').default('false'), // 'true' or 'false' as string
    revokedAt: timestamp('revoked_at'),
    revokedReason: text('revoked_reason'), // 'logout', 'rotation', 'security_breach', etc.
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    // Security tracking
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    lastUsedAt: timestamp('last_used_at'),
  },
  (table) => ({
    userIdIdx: index('refresh_tokens_user_id_idx').on(table.userId),
    tokenIdx: index('refresh_tokens_token_idx').on(table.token),
    expiresAtIdx: index('refresh_tokens_expires_at_idx').on(table.expiresAt),
    revokedIdx: index('refresh_tokens_revoked_idx').on(table.isRevoked),
  }),
);

export type RefreshToken = typeof RefreshTokenTable.$inferSelect;
export type NewRefreshToken = typeof RefreshTokenTable.$inferInsert;
