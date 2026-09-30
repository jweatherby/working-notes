// Native per-user locations, the way a desktop app stores its data.
// Relative imports only — prisma.config.ts and scripts load this outside SvelteKit.

import { homedir, platform } from 'node:os';
import { posix, win32 } from 'node:path';

const { join } = posix;

const APP_NAME = 'Working Notes';
const APP_SLUG = 'working-notes';

export interface AppDirsHost {
  readonly platform: NodeJS.Platform;
  readonly home: string;
  readonly env: Readonly<Record<string, string | undefined>>;
}

const currentHost = (): AppDirsHost => ({ platform: platform(), home: homedir(), env: process.env });

/**
 * Pure. `~/Library/Application Support/Working Notes` on macOS,
 * `%LOCALAPPDATA%\Working Notes` on Windows (local, not roaming: a SQLite database
 * must not follow a roaming profile), and the XDG data dir elsewhere.
 */
export const dataDirFor = (host: AppDirsHost): string => {
  if (host.platform === 'darwin') return join(host.home, 'Library', 'Application Support', APP_NAME);
  if (host.platform === 'win32') return win32.join(host.env['LOCALAPPDATA'] || win32.join(host.home, 'AppData', 'Local'), APP_NAME);
  return join(host.env['XDG_DATA_HOME'] || join(host.home, '.local', 'share'), APP_SLUG);
};

/** Pure. `~/Library/Logs/Working Notes` on macOS; `<data dir>/Logs` on Windows; `<data dir>/logs` elsewhere. */
export const logsDirFor = (host: AppDirsHost): string => {
  if (host.platform === 'darwin') return join(host.home, 'Library', 'Logs', APP_NAME);
  if (host.platform === 'win32') return win32.join(dataDirFor(host), 'Logs');
  return join(dataDirFor(host), 'logs');
};

export const appDataDir = (): string => dataDirFor(currentHost());

export const appLogsDir = (): string => logsDirFor(currentHost());
