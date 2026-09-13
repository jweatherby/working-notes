// Native per-user locations, the way a desktop app stores its data.
// Relative imports only — prisma.config.ts and scripts load this outside SvelteKit.

import { homedir, platform } from 'node:os';
import { join } from 'node:path';

const APP_NAME = 'Working Notes';
const APP_SLUG = 'working-notes';

/** `~/Library/Application Support/Working Notes` on macOS; the XDG data dir elsewhere. */
export const appDataDir = (): string =>
  platform() === 'darwin'
    ? join(homedir(), 'Library', 'Application Support', APP_NAME)
    : join(process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share'), APP_SLUG);

/** `~/Library/Logs/Working Notes` on macOS; `<data dir>/logs` elsewhere. */
export const appLogsDir = (): string =>
  platform() === 'darwin' ? join(homedir(), 'Library', 'Logs', APP_NAME) : join(appDataDir(), 'logs');
