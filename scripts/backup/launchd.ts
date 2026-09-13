// The hourly backup LaunchAgent (macOS).

import { spawnSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import { ok, err, type Result } from '$shared/utils/result';

export const LABEL = 'dev.jweatherby.working-notes.backup';

export interface PlistOptions {
  readonly label: string;
  readonly bunPath: string;
  readonly repoDir: string;
  readonly logFile: string;
  readonly intervalSeconds: number;
  readonly path: string;
}

const xml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const renderPlist = (o: PlistOptions): string => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${xml(o.label)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xml(o.bunPath)}</string>
    <string>scripts/backup/main.ts</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${xml(o.repoDir)}</string>
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
  repoDir: string,
  logFile: string
): Promise<Result<{ readonly plist: string }>> => {
  if (platform() !== 'darwin') return err(new Error('The backup LaunchAgent is macOS-only; schedule `bun run backup` with cron instead'));

  // The Homebrew symlink survives `brew upgrade`; process.execPath points into a versioned Cellar folder.
  const bunPath = Bun.which('bun') ?? process.execPath;
  const plist = plistPath();
  await mkdir(join(homedir(), 'Library', 'LaunchAgents'), { recursive: true });
  await mkdir(join(logFile, '..'), { recursive: true });
  await writeFile(plist, renderPlist({
    label: LABEL,
    bunPath,
    repoDir,
    logFile,
    intervalSeconds: 3600,
    path: `${join(bunPath, '..')}:/usr/local/bin:/usr/bin:/bin`
  }));

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
