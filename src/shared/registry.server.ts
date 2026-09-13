// The composition root. The ONLY place `new PrismaClient()` is ever called.
// Everything (routes, CLI-facing tRPC, integration tests) pulls Prisma through
// getRegistry() so there is exactly one PrismaClient in the process.

import { mkdirSync } from 'node:fs';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '../../generated/prisma/client';
import { createLogger } from '$shared/utils/logger';
import { createStorageClient } from '$shared/storage/client.server';
import { settings } from '$shared/settings/server/index.server';
import { databaseUrl } from '$shared/settings/server/paths';
import type { Registry } from './registry';

let cached: Registry | undefined;

export const getRegistry = (): Registry => {
  if (cached) return cached;
  mkdirSync(settings.dataDir, { recursive: true });
  cached = {
    prisma: new PrismaClient({ adapter: new PrismaLibSql({ url: databaseUrl(settings) }) }),
    now: () => new Date(),
    uuid: () => crypto.randomUUID(),
    logger: createLogger(),
    storage: createStorageClient()
  };
  return cached;
};
