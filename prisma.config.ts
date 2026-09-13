import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { defineConfig } from 'prisma/config';
import { settings } from './src/shared/settings/server/index.server';
import { databaseUrl, legacyDatabasePath, notebookDir, rootSettingsPath } from './src/shared/settings/server/paths';

// Prisma CLI commands (`bun run db:migrate`, `db:studio`) work on one notebook:
// WNOTES_NOTEBOOK, else the default. Other notebooks migrate forward the next
// time the app or CLI opens them.
const defaultNotebook = (): string => {
  try {
    const data = JSON.parse(readFileSync(rootSettingsPath(settings), 'utf8')) as { readonly defaultNotebook?: unknown };
    if (typeof data.defaultNotebook === 'string') return data.defaultNotebook;
  } catch {
    // No settings.json yet.
  }
  return 'notebook';
};

if (existsSync(legacyDatabasePath(settings))) {
  throw new Error('This data directory predates notebooks. Run any wnotes command (for example `wnotes notebook.list`) to move it into place, then try again.');
}

const notebook = process.env['WNOTES_NOTEBOOK'] || defaultNotebook();
mkdirSync(notebookDir(settings, notebook), { recursive: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations'
  },
  datasource: {
    url: databaseUrl(settings, notebook)
  }
});
