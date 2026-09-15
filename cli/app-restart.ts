// `wnotes app restart`: stops the running Working Notes app, whatever version it is,
// and starts it again in the background. From a release, and from a clone (bin/wnotes).

import { resolve } from 'node:path';
import { appUrl, currentAppOwner, restartApp } from './app-launch';

try {
  const { stopped } = await restartApp(currentAppOwner(resolve(import.meta.dir, '..')));
  console.log(`${stopped ? 'Restarted' : 'Started'} Working Notes at ${appUrl(null)}`);
  process.exit(0);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
