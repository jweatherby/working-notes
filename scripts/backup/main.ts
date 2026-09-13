#!/usr/bin/env bun
// Working Notes backups. Snapshots stay on this Mac in <data dir>/Backups.
//   bun run backup                          snapshot if the data changed (what the hourly LaunchAgent runs)
//   bun run backup --force [--reason text]  snapshot even if unchanged
//   bun run backup list                     list snapshots
//   bun run backup restore <id|latest>      restore (the app must not be running)
//   bun run backup install | uninstall      manage the hourly LaunchAgent

import { resolve } from 'node:path';
import { appLogsDir } from '$shared/settings/server/app-dirs';
import { settings } from '$shared/settings/server/index.server';
import { backupsDir } from '$shared/settings/server/paths';
import { getRegistry } from '$shared/registry.server';
import { createSnapshot, listSnapshots } from './snapshot';
import { restoreSnapshot } from './restore';
import { LABEL, installAgent, uninstallAgent } from './launchd';

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

const main = async (): Promise<number> => {
  switch (command) {
    case 'run': {
      const scheduled = process.env.XPC_SERVICE_NAME === LABEL;
      const outcome = await createSnapshot({
        force: hasFlag('force'),
        reason: option('reason') ?? (scheduled ? 'hourly' : 'manual')
      });
      const s = outcome.snapshot;
      if (outcome.status === 'unchanged') {
        console.log(`${stamp()} unchanged since ${s?.id}`);
      } else if (s) {
        const pruned = outcome.pruned.length ? `, pruned ${outcome.pruned.length}` : '';
        console.log(`${stamp()} created ${s.id} (${s.manifest.reason}, ${size(s.manifest.bytes)})${pruned}`);
      }
      return 0;
    }
    case 'list': {
      const snapshots = await listSnapshots();
      for (const s of snapshots) {
        const c = s.manifest.counts;
        console.log(`${s.id}  ${size(s.manifest.bytes).padStart(9)}  people ${c['person'] ?? 0}, projects ${c['project'] ?? 0}, notes ${c['note'] ?? 0}, reports ${c['report'] ?? 0}, files ${s.manifest.files.length}  — ${s.manifest.reason}`);
      }
      console.log(`\n${snapshots.length} snapshot(s) in ${backupsDir(settings)}`);
      return 0;
    }
    case 'restore': {
      const target = args[1];
      if (!target || target.startsWith('--')) {
        console.error('Usage: bun run backup restore <id|latest>');
        return 1;
      }
      const result = await restoreSnapshot(target);
      if (!result.ok) {
        console.error(`Restore refused: ${result.error.message}`);
        return 1;
      }
      console.log(`Restored ${result.value.restored}. The data it replaced is saved as snapshot ${result.value.safetySnapshot}.`);
      return 0;
    }
    case 'install': {
      const logFile = resolve(appLogsDir(), 'backup.log');
      const result = await installAgent(resolve(import.meta.dir, '..', '..'), logFile);
      if (!result.ok) {
        console.error(result.error.message);
        return 1;
      }
      console.log(`Hourly backups installed (${result.value.plist}).\nSnapshots: ${backupsDir(settings)}\nLog: ${logFile}`);
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
  await getRegistry().prisma.$disconnect();
}
process.exit(code);
