// Entry point of the standalone `wnotes` binary that scripts/release/build.ts compiles.
// It runs the same commands as bin/wnotes with Bun built in, so a machine needs no
// clone. Its resources, the UI's static files and the migrations, sit next to the
// binary (the plugin shim installs them together under <data dir>/App/<version>).

import { dirname, join } from 'node:path';
import type { SvelteKitServer } from './app-server';

export interface StandaloneApp {
  /** Loads the built SvelteKit server. A lazy import, so only `wnotes app` pays for it. */
  readonly loadServer: () => Promise<SvelteKitServer>;
}

export const runStandalone = async (app: StandaloneApp): Promise<void> => {
  const resources = dirname(process.execPath);
  // Read by cli/main.ts, cli/mcp.ts and scripts/backup/main.ts, which otherwise run from a clone.
  process.env['WNOTES_STANDALONE'] = '1';
  process.env['WNOTES_MIGRATIONS_DIR'] ??= join(resources, 'migrations');

  switch (process.argv[2]) {
    case 'mcp':
      await import('./mcp');
      return;
    case 'backup':
      // scripts/backup/main.ts reads its own arguments from argv[2].
      process.argv.splice(2, 1);
      await import('../scripts/backup/main');
      return;
    case 'app': {
      const { serveApp } = await import('./app-server');
      // The shim installs VERSION beside the binary; release apps report it so a newer release can replace them.
      const version = (await Bun.file(join(resources, 'VERSION')).text().catch(() => 'unknown')).trim();
      await serveApp({ server: await app.loadServer(), clientDir: join(resources, 'client'), version });
      return;
    }
    default:
      await import('./main');
  }
};
