import { describe, it, expect } from 'vitest';
import { LABEL, renderPlist } from '../launchd';

describe('renderPlist', () => {
  const plist = renderPlist({
    label: LABEL,
    bunPath: '/opt/homebrew/bin/bun',
    repoDir: '/Users/me/code/working-notes & co',
    logFile: '/Users/me/Library/Logs/Working Notes/backup.log',
    intervalSeconds: 3600,
    path: '/opt/homebrew/bin:/usr/bin:/bin'
  });

  it('runs the backup script from the repo, hourly and at load', () => {
    expect(plist).toContain(`<string>${LABEL}</string>`);
    expect(plist).toMatch(/<string>\/opt\/homebrew\/bin\/bun<\/string>\s*<string>scripts\/backup\/main\.ts<\/string>/);
    expect(plist).toContain('<key>WorkingDirectory</key>\n  <string>/Users/me/code/working-notes &amp; co</string>');
    expect(plist).toContain('<key>StartInterval</key>\n  <integer>3600</integer>');
    expect(plist).toContain('<key>RunAtLoad</key>\n  <true/>');
  });

  it('logs to the log file and escapes XML', () => {
    expect(plist.match(/Library\/Logs\/Working Notes\/backup\.log/g)).toHaveLength(2);
    expect(plist).toContain('working-notes &amp; co');
    expect(plist).not.toContain('working-notes & co');
  });
});
