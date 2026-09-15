// Starting the UI from the MCP server (the `app_open` tool), so a machine without a
// clone or a terminal habit can still open it: runs `wnotes app` in the background.
// The app keeps running after the MCP server exits, so a release also replaces an app
// left running by an older version (see planAppLaunch).

import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { APP_CONTROL_PATH, APP_HOST, APP_PORT, APP_STOP_PATH } from './app-server';
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

/**
 * What's on the app port: nothing, a release app reporting its version, or something
 * else (a clone's dev server, or a release from before apps reported a version).
 */
export type RunningApp = null | { readonly version: string } | 'other';

export type AppLaunchPlan = 'start' | 'reuse' | 'restart';

/**
 * A release restarts a release app of a different version, so updating the plugin
 * updates the app. It never touches anything it can't identify, and a clone never
 * restarts anything (its dev server reloads by itself).
 */
export const planAppLaunch = (running: RunningApp, own: { readonly standalone: boolean; readonly version: string }): AppLaunchPlan => {
  if (running === null) return 'start';
  if (!own.standalone || running === 'other') return 'reuse';
  return running.version === own.version ? 'reuse' : 'restart';
};

const base = `http://${APP_HOST}:${APP_PORT}`;
const sleep = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

export const probeApp = async (): Promise<RunningApp> => {
  if (!(await isPortListening(APP_PORT))) return null;
  try {
    const response = await fetch(`${base}${APP_CONTROL_PATH}`, { signal: AbortSignal.timeout(1_000) });
    const body: unknown = response.ok ? await response.json() : null;
    const version = typeof body === 'object' && body !== null ? (body as { version?: unknown }).version : undefined;
    return typeof version === 'string' ? { version } : 'other';
  } catch {
    return 'other';
  }
};

const waitForPort = async (listening: boolean, timeoutMs: number): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await isPortListening(APP_PORT)) === listening) return true;
    await sleep(250);
  }
  return false;
};

const stopApp = async (): Promise<void> => {
  await fetch(`${base}${APP_STOP_PATH}`, { method: 'POST', headers: { 'x-working-notes': '1' }, signal: AbortSignal.timeout(2_000) }).catch(() => null);
  if (!(await waitForPort(false, 5_000))) {
    throw new Error(`An older Working Notes app is still running on ${APP_HOST}:${APP_PORT}. Quit it, then open the app again.`);
  }
};

const startApp = async (launch: LaunchCommand, timeoutMs: number): Promise<void> => {
  let failure: Error | null = null;
  const child = spawn(launch.command, [...launch.args], { detached: true, stdio: 'ignore' });
  child.on('error', (error) => {
    failure = error;
  });
  child.unref();

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(250);
    if (failure) throw new Error(`Couldn't start Working Notes: ${(failure as Error).message}`);
    if (await isPortListening(APP_PORT)) return;
  }
  throw new Error(`Working Notes didn't start within ${timeoutMs / 1000} seconds. Run \`wnotes app\` in a terminal to see why.`);
};

export interface AppOwner {
  readonly launch: LaunchCommand;
  readonly standalone: boolean;
  readonly version: string;
}

export interface OpenAppResult {
  readonly started: boolean;
  readonly restarted: boolean;
}

export const openApp = async (owner: AppOwner, timeoutMs = 20_000): Promise<OpenAppResult> => {
  const plan = planAppLaunch(await probeApp(), owner);
  if (plan === 'reuse') return { started: false, restarted: false };
  if (plan === 'restart') await stopApp();
  await startApp(owner.launch, timeoutMs);
  return { started: true, restarted: plan === 'restart' };
};

/** When the MCP server starts: replace an app an older release left running, but start nothing new. */
export const restartStaleApp = async (owner: AppOwner): Promise<boolean> => {
  if (planAppLaunch(await probeApp(), owner) !== 'restart') return false;
  await stopApp();
  await startApp(owner.launch, 20_000);
  return true;
};
