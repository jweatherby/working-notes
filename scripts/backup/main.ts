#!/usr/bin/env bun
// Working Notes backups. Each notebook's snapshots stay on this Mac in <data dir>/Backups/<notebook>.
//   bun run backup                          snapshot every notebook whose data changed (what the hourly LaunchAgent runs)
//   bun run backup --force [--reason text]  snapshot even if unchanged
//   bun run backup list                     list snapshots
//   bun run backup restore <id|latest>      restore (the app must not be running)
//   bun run backup install | uninstall      manage the hourly LaunchAgent
// Add --notebook <id> to run, list or restore one notebook. Restore needs it when there is more than one.

import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { appDataDir, appLogsDir } from '$shared/settings/server/app-dirs';
import { settings } from '$shared/settings/server/index.server';
import { backupsDir, backupsRoot } from '$shared/settings/server/paths';
import { readNotebooks, resolveCurrentNotebook } from '$shared/notebooks/current.server';
import { closeRegistries } from '$shared/registry.server';
import type { NotebookInfo } from '$shared/types/notebook';
import { ok, err, type Result } from '$shared/utils/result';
import { createSnapshot, listSnapshots } from './snapshot';
import { restoreSnapshot } from './restore';
import { LABEL, backupCommand, installAgent, uninstallAgent } from './launchd';

const args = process.argv.slice(2);
const command = args[0] && !args[0].startsWith('--') ? args[0] : 'run';
const hasFlag = (name: string): boolean => args.includes(`--${name}`);
const option = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i > -1 ? args[i + 1] : undefined;
};

const stamp = (): string => new Date().toISOString();
const size = (bytes: number): string =>
  bytes < 1024 ? `${bytes} B` : bytes < 1_048_576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1_048_576).toFixed(1)} MB`;

/** The notebook named with --notebook, or every notebook. */
const selectedNotebooks = async (): Promise<Result<readonly NotebookInfo[]>> => {
  if (!hasFlag('notebook')) return ok(await readNotebooks());
  const named = option('notebook');
  if (!named || named.startsWith('--')) return err(new Error('--notebook needs a notebook id'));
  const notebook = await resolveCurrentNotebook({ explicit: named });
  return notebook.ok ? ok([notebook.value]) : notebook;
};

const main = async (): Promise<number> => {
  switch (command) {
    case 'run': {
      const notebooks = await selectedNotebooks();
      if (!notebooks.ok) {
        console.error(notebooks.error.message);
        return 1;
      }
      const scheduled = process.env.XPC_SERVICE_NAME === LABEL;
      let failed = false;
      for (const notebook of notebooks.value) {
        try {
          const outcome = await createSnapshot({
            notebook: notebook.id,
            force: hasFlag('force'),
            reason: option('reason') ?? (scheduled ? 'hourly' : 'manual')
          });
          const s = outcome.snapshot;
          if (outcome.status === 'unchanged') {
            console.log(`${stamp()} ${notebook.id}: unchanged since ${s?.id}`);
          } else if (s) {
            const pruned = outcome.pruned.length ? `, pruned ${outcome.pruned.length}` : '';
            console.log(`${stamp()} ${notebook.id}: created ${s.id} (${s.manifest.reason}, ${size(s.manifest.bytes)})${pruned}`);
          }
        } catch (error) {
          failed = true;
          console.error(`${stamp()} ${notebook.id}: backup failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      return failed ? 1 : 0;
    }
    case 'list': {
      const notebooks = await selectedNotebooks();
      if (!notebooks.ok) {
        console.error(notebooks.error.message);
        return 1;
      }
      for (const notebook of notebooks.value) {
        const snapshots = await listSnapshots(notebook.id);
        console.log(`${notebook.name} (${notebook.id})`);
        for (const s of snapshots) {
          const c = s.manifest.counts;
          console.log(`  ${s.id}  ${size(s.manifest.bytes).padStart(9)}  people ${c['person'] ?? 0}, projects ${c['project'] ?? 0}, notes ${c['note'] ?? 0}, reports ${c['report'] ?? 0}, files ${s.manifest.files.length}  — ${s.manifest.reason}`);
        }
        console.log(`  ${snapshots.length} snapshot(s) in ${backupsDir(settings, notebook.id)}\n`);
      }
      return 0;
    }
    case 'restore': {
      const target = args[1];
      if (!target || target.startsWith('--')) {
        console.error('Usage: bun run backup restore <id|latest> --notebook <id>');
        return 1;
      }
      const notebooks = await selectedNotebooks();
      if (!notebooks.ok) {
        console.error(`Restore refused: ${notebooks.error.message}`);
        return 1;
      }
      const [notebook, ...others] = notebooks.value;
      if (!notebook || others.length > 0) {
        console.error(`Restore refused: say which notebook with --notebook <id> (notebooks: ${notebooks.value.map((n) => n.id).join(', ')}).`);
        return 1;
      }
      const result = await restoreSnapshot(notebook.id, target);
      if (!result.ok) {
        console.error(`Restore refused: ${result.error.message}`);
        return 1;
      }
      console.log(`Restored ${result.value.restored} into ${notebook.name} (${notebook.id}). The data it replaced is saved as snapshot ${result.value.safetySnapshot}.`);
      return 0;
    }
    case 'install': {
      const logFile = resolve(appLogsDir(), 'backup.log');
      // A release runs through App/current, which the plugin shim repoints on every update.
      const current = join(appDataDir(), 'App', 'current', 'wnotes');
      const command = backupCommand({
        standaloneBinary: process.env['WNOTES_STANDALONE'] === '1' ? (existsSync(current) ? current : process.execPath) : null,
        dataDir: appDataDir(),
        // The Homebrew symlink survives `brew upgrade`; process.execPath points into a versioned Cellar folder.
        bunPath: Bun.which('bun') ?? process.execPath,
        repoDir: resolve(import.meta.dir, '..', '..')
      });
      const result = await installAgent(command, logFile);
      if (!result.ok) {
        console.error(result.error.message);
        return 1;
      }
      console.log(`Hourly backups installed (${result.value.plist}).\nSnapshots: ${backupsRoot(settings)}\nLog: ${logFile}`);
      return 0;
    }
    case 'uninstall': {
      await uninstallAgent();
      console.log('Hourly backups removed. Existing snapshots were left in place.');
      return 0;
    }
    default:
      console.error(`Unknown command "${command}". Use run, list, restore, install or uninstall.`);
      return 1;
  }
};

let code = 1;
try {
  code = await main();
} catch (error) {
  console.error(`${stamp()} backup ${command} failed: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  await closeRegistries();
}
process.exit(code);
