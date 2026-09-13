import { describe, it, expect } from 'vitest';
import { LABEL, backupCommand, renderPlist } from '../launchd';

const dataDir = '/Users/me/Library/Application Support/Working Notes';
const logFile = '/Users/me/Library/Logs/Working Notes/backup.log';

describe('renderPlist from a clone', () => {
  const command = backupCommand({ standaloneBinary: null, dataDir, bunPath: '/opt/homebrew/bin/bun', repoDir: '/Users/me/code/working-notes & co' });
  const plist = renderPlist({ ...command, label: LABEL, logFile, intervalSeconds: 3600 });

  it('runs the backup script from the repo, hourly and at load', () => {
    expect(plist).toContain(`<string>${LABEL}</string>`);
    expect(plist).toMatch(/<string>\/opt\/homebrew\/bin\/bun<\/string>\s*<string>scripts\/backup\/main\.ts<\/string>/);
    expect(plist).toContain('<key>WorkingDirectory</key>\n  <string>/Users/me/code/working-notes &amp; co</string>');
    expect(plist).toContain('<string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>');
    expect(plist).toContain('<key>StartInterval</key>\n  <integer>3600</integer>');
    expect(plist).toContain('<key>RunAtLoad</key>\n  <true/>');
  });

  it('logs to the log file and escapes XML', () => {
    expect(plist.match(/Library\/Logs\/Working Notes\/backup\.log/g)).toHaveLength(2);
    expect(plist).toContain('working-notes &amp; co');
    expect(plist).not.toContain('working-notes & co');
  });
});

describe('renderPlist from a release', () => {
  it('runs the standalone binary through App/current, from the data directory', () => {
    const binary = `${dataDir}/App/current/wnotes`;
    const command = backupCommand({ standaloneBinary: binary, dataDir, bunPath: '/unused/bun', repoDir: '/unused' });
    expect(command).toEqual({ programArguments: [binary, 'backup'], workingDirectory: dataDir, path: '/usr/bin:/bin' });

    const plist = renderPlist({ ...command, label: LABEL, logFile, intervalSeconds: 3600 });
    expect(plist).toMatch(/<string>\/Users\/me\/Library\/Application Support\/Working Notes\/App\/current\/wnotes<\/string>\s*<string>backup<\/string>/);
    expect(plist).not.toContain('bun');
  });
});
