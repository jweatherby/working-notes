// The hourly backup LaunchAgent (macOS).

import { spawnSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { dirname, join } from 'node:path';
import { ok, err, type Result } from '$shared/utils/result';

export const LABEL = 'dev.jweatherby.working-notes.backup';

/** What the LaunchAgent runs. */
export interface BackupCommand {
  readonly programArguments: readonly string[];
  readonly workingDirectory: string;
  readonly path: string;
}

export interface PlistOptions extends BackupCommand {
  readonly label: string;
  readonly logFile: string;
  readonly intervalSeconds: number;
}

export interface BackupCommandInputs {
  /** The standalone binary to run, when this is a release rather than a clone. */
  readonly standaloneBinary: string | null;
  readonly dataDir: string;
  readonly bunPath: string;
  readonly repoDir: string;
}

/**
 * Pure. A release runs its binary through `<data dir>/App/current`, which the plugin
 * shim repoints on every update; a clone runs the backup script with Bun.
 */
export const backupCommand = (i: BackupCommandInputs): BackupCommand =>
  i.standaloneBinary
    ? { programArguments: [i.standaloneBinary, 'backup'], workingDirectory: i.dataDir, path: '/usr/bin:/bin' }
    : { programArguments: [i.bunPath, 'scripts/backup/main.ts'], workingDirectory: i.repoDir, path: `${dirname(i.bunPath)}:/usr/local/bin:/usr/bin:/bin` };

const xml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const renderPlist = (o: PlistOptions): string => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${xml(o.label)}</string>
  <key>ProgramArguments</key>
  <array>
${o.programArguments.map((arg) => `    <string>${xml(arg)}</string>`).join('\n')}
  </array>
  <key>WorkingDirectory</key>
  <string>${xml(o.workingDirectory)}</string>
  <key>StartInterval</key>
  <integer>${o.intervalSeconds}</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>ProcessType</key>
  <string>Background</string>
  <key>LowPriorityIO</key>
  <true/>
  <key>Nice</key>
  <integer>10</integer>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${xml(o.path)}</string>
  </dict>
  <key>StandardOutPath</key>
  <string>${xml(o.logFile)}</string>
  <key>StandardErrorPath</key>
  <string>${xml(o.logFile)}</string>
</dict>
</plist>
`;

export const plistPath = (): string => join(homedir(), 'Library', 'LaunchAgents', `${LABEL}.plist`);

const domain = (): string => `gui/${process.getuid?.() ?? 501}`;

export const installAgent = async (
  command: BackupCommand,
  logFile: string
): Promise<Result<{ readonly plist: string }>> => {
  if (platform() !== 'darwin') return err(new Error('The backup LaunchAgent is macOS-only; schedule `wnotes backup` with cron instead'));

  const plist = plistPath();
  await mkdir(join(homedir(), 'Library', 'LaunchAgents'), { recursive: true });
  await mkdir(dirname(logFile), { recursive: true });
  await writeFile(plist, renderPlist({ ...command, label: LABEL, logFile, intervalSeconds: 3600 }));

  spawnSync('launchctl', ['bootout', `${domain()}/${LABEL}`]);
  const loaded = spawnSync('launchctl', ['bootstrap', domain(), plist], { encoding: 'utf8' });
  if (loaded.status !== 0) return err(new Error(`launchctl bootstrap failed: ${loaded.stderr.trim()}`));
  return ok({ plist });
};

export const uninstallAgent = async (): Promise<Result<{ readonly removed: boolean }>> => {
  if (platform() !== 'darwin') return ok({ removed: false });
  spawnSync('launchctl', ['bootout', `${domain()}/${LABEL}`]);
  await rm(plistPath(), { force: true });
  return ok({ removed: true });
};
