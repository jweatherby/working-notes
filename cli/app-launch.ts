// Starting the UI from the MCP server (the `app_open` tool), so a machine without a
// clone or a terminal habit can still open it: runs `wnotes app` in the background.
// The app keeps running after the MCP server exits.

import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { APP_HOST, APP_PORT } from './app-server';
import { isPortListening } from '../scripts/backup/restore';

export interface LaunchCommand {
  readonly command: string;
  readonly args: readonly string[];
}

/** A release runs its own binary; a clone runs bin/wnotes, which starts the dev server. */
export const appLaunchCommand = (o: { readonly standalone: boolean; readonly execPath: string; readonly repoDir: string }): LaunchCommand =>
  o.standalone ? { command: o.execPath, args: ['app'] } : { command: join(o.repoDir, 'bin', 'wnotes'), args: ['app'] };

/** The app's address, opening the given notebook. */
export const appUrl = (notebookId: string | null): string =>
  `http://${APP_HOST}:${APP_PORT}/app${notebookId ? `?notebook=${encodeURIComponent(notebookId)}` : ''}`;

export const openApp = async (launch: LaunchCommand, timeoutMs = 20_000): Promise<{ readonly started: boolean }> => {
  if (await isPortListening(APP_PORT)) return { started: false };

  let failure: Error | null = null;
  const child = spawn(launch.command, [...launch.args], { detached: true, stdio: 'ignore' });
  child.on('error', (error) => {
    failure = error;
  });
  child.unref();

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((done) => setTimeout(done, 250));
    if (failure) throw new Error(`Couldn't start Working Notes: ${(failure as Error).message}`);
    if (await isPortListening(APP_PORT)) return { started: true };
  }
  throw new Error(`Working Notes didn't start within ${timeoutMs / 1000} seconds. Run \`wnotes app\` in a terminal to see why.`);
};
