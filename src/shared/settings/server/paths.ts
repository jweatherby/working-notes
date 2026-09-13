// Filesystem locations derived from settings.dataDir.
// Relative imports only — prisma.config.ts loads this outside SvelteKit.

import { resolve } from 'node:path';
import type { ServerSettings } from './types';

export const databasePath = (s: ServerSettings): string => resolve(s.dataDir, 'working-notes.db');

export const databaseUrl = (s: ServerSettings): string => `file:${databasePath(s)}`;

export const filesDir = (s: ServerSettings): string => resolve(s.dataDir, 'files');

export const backupsDir = (s: ServerSettings): string => resolve(s.dataDir, 'Backups');

/** Migrations shipped in the repo. Processes run from the repo root (the CLI chdirs there). */
export const migrationsDir = (): string => resolve('prisma', 'migrations');
