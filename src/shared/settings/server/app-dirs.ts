// Native per-user locations, the way a desktop app stores its data.
// Relative imports only — prisma.config.ts and scripts load this outside SvelteKit.

import { homedir, platform } from 'node:os';
import { posix, win32 } from 'node:path';
import { moveLegacyDataDir } from './legacy-data-dir';

const { join } = posix;

const APP_NAME = 'Wonos';
const APP_SLUG = 'wonos';
/** The names before the rename to Wonos. moveLegacyDataDir (legacy-data-dir.ts) moves the data from there. */
const LEGACY_APP_NAME = 'Working Notes';
const LEGACY_APP_SLUG = 'working-notes';

export interface AppDirsHost {
  readonly platform: NodeJS.Platform;
  readonly home: string;
  readonly env: Readonly<Record<string, string | undefined>>;
}

const currentHost = (): AppDirsHost => ({ platform: platform(), home: homedir(), env: process.env });

/**
 * Pure. `~/Library/Application Support/Wonos` on macOS,
 * `%LOCALAPPDATA%\Wonos` on Windows (local, not roaming: a SQLite database
 * must not follow a roaming profile), and the XDG data dir elsewhere.
 */
export const dataDirFor = (host: AppDirsHost, name = APP_NAME, slug = APP_SLUG): string => {
  if (host.platform === 'darwin') return join(host.home, 'Library', 'Application Support', name);
  if (host.platform === 'win32') return win32.join(host.env['LOCALAPPDATA'] || win32.join(host.home, 'AppData', 'Local'), name);
  return join(host.env['XDG_DATA_HOME'] || join(host.home, '.local', 'share'), slug);
};

/** Pure. Where the data lived before the rename to Wonos. */
export const legacyDataDirFor = (host: AppDirsHost): string => dataDirFor(host, LEGACY_APP_NAME, LEGACY_APP_SLUG);

/** Pure. `~/Library/Logs/Wonos` on macOS; `<data dir>/Logs` on Windows; `<data dir>/logs` elsewhere. */
export const logsDirFor = (host: AppDirsHost): string => {
  if (host.platform === 'darwin') return join(host.home, 'Library', 'Logs', APP_NAME);
  if (host.platform === 'win32') return win32.join(dataDirFor(host), 'Logs');
  return join(dataDirFor(host), 'logs');
};

let resolvedDataDir: string | undefined;

/** The data directory, after moving it from its name before the rename, once per process. */
export const appDataDir = (): string => {
  resolvedDataDir ??= moveLegacyDataDir(legacyDataDirFor(currentHost()), dataDirFor(currentHost()));
  return resolvedDataDir;
};

export const appLogsDir = (): string => logsDirFor(currentHost());
