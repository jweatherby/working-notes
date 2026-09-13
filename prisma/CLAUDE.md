# Database Conventions — `prisma/`

SQLite, one file per user: `~/Library/Application Support/Working Notes/working-notes.db` (`./data/test` for integration tests). The path comes from `src/shared/settings/server` via `server/paths.ts`, used by `prisma.config.ts`, `src/shared/registry.server.ts` and the migrator.

## Schema conventions

- snake_case **singular** table names and snake_case columns via `@@map` / `@map`
- **No enums** (the SQLite connector rejects them). Enum-like columns are `String` with a string `@default`, validated by Zod against the unions in `src/shared/types/enums.ts`. Add new values there.
- **No native type attributes** (`@db.Text` etc.) and no `String[]`
- No users, orgs or ownership columns. Don't add `createdById` or `orgId`.
- Polymorphic assets use `entityType String` + `entityId String` with `@@index([entityType, entityId])`, and no foreign key to the entity
- The Prisma client is generated to `generated/prisma` (gitignored); import it only in `src/shared/registry.ts` / `registry.server.ts`

## Migrations

**Migrations apply themselves.** `src/shared/db/migrate.server.ts` runs pending migrations in-process whenever the app, the CLI or a backup starts (via `ensureDatabase()`). It reads and writes Prisma's `_prisma_migrations` table in Prisma's own format, so both tools agree on what's applied.

- **Author a change:** edit `schema.prisma`, then `bun run db:migrate --name <descriptive_snake_case>`. This runs against your real notebook, so take `bun run backup --force --reason "before <migration>"` first. Commit the new folder with the schema.
- **Never edit an applied migration.** The migrator compares checksums and refuses to start if a migration changed after it ran; fix forward with a new migration.
- **SQLite migrations run without a wrapping transaction** (Prisma's table-redefinition SQL needs `PRAGMA foreign_keys=OFF`). If one fails, its row keeps `finished_at` null with the error in `logs`, and startup refuses until it's repaired. Restore the pre-migration snapshot, fix the migration, and retry.
- Don't use `prisma db push`.
