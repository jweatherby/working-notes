import { mkdirSync } from 'node:fs';
import { defineConfig } from 'prisma/config';
import { settings } from './src/shared/settings/server/index.server';
import { databaseUrl } from './src/shared/settings/server/paths';

mkdirSync(settings.dataDir, { recursive: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations'
  },
  datasource: {
    url: databaseUrl(settings)
  }
});
