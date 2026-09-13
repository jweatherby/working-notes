import { describe, it, expect } from 'vitest';
import { PLUGIN_ID, planInstall, planUninstall, type SetupState } from '../plan';

const repo = '/Users/me/code/working-notes';
const cli = `${repo}/bin/wnotes`;
const pack = { kind: 'pack', pluginDir: `${repo}/plugin`, output: `${repo}/dist/working-notes.zip` } as const;

const base: SetupState = {
  repoDir: repo,
  pointerFile: '/data/app-path',
  pointer: null,
  binLinkPath: '/Users/me/.bun/bin/wnotes',
  binLink: { kind: 'missing' },
  binDirOnPath: true,
  legacySkillPath: '/Users/me/.claude/skills/working-notes',
  legacySkillTarget: null,
  claude: { marketplaces: [], plugins: [] }
};

const installed: SetupState = {
  ...base,
  pointer: repo,
  binLink: { kind: 'symlink', target: cli },
  claude: { marketplaces: ['working-notes'], plugins: [PLUGIN_ID] }
};

describe('planInstall', () => {
  it('writes the pointer, links wnotes, builds the zip, adds the marketplace and installs on a fresh machine', () => {
    expect(planInstall(base)).toEqual([
      { kind: 'write', path: '/data/app-path', contents: repo },
      { kind: 'link', path: '/Users/me/.bun/bin/wnotes', target: cli },
      pack,
      { kind: 'claude', args: ['plugin', 'marketplace', 'add', repo] },
      { kind: 'claude', args: ['plugin', 'install', PLUGIN_ID] }
    ]);
  });

  it('only rebuilds the zip and updates when everything is already in place', () => {
    expect(planInstall(installed)).toEqual([
      pack,
      { kind: 'claude', args: ['plugin', 'marketplace', 'update', 'working-notes'] },
      { kind: 'claude', args: ['plugin', 'update', PLUGIN_ID] }
    ]);
  });

  it("moves another clone's PATH link, but leaves other commands named wnotes alone", () => {
    const moved = planInstall({ ...installed, binLink: { kind: 'symlink', target: '/Users/me/old/working-notes/bin/wnotes' } });
    expect(moved).toContainEqual({ kind: 'link', path: '/Users/me/.bun/bin/wnotes', target: cli });

    for (const binLink of [{ kind: 'other' }, { kind: 'symlink', target: '/Users/me/.bun/install/global/node_modules/wnotes/bin/wnotes' }] as const) {
      const steps = planInstall({ ...installed, binLink });
      expect(steps.some((s) => s.kind === 'link')).toBe(false);
      expect(steps).toContainEqual({ kind: 'note', message: expect.stringContaining("isn't a Working Notes link") });
    }
  });

  it("says when the link's directory isn't on PATH", () => {
    expect(planInstall({ ...installed, binDirOnPath: false })).toContainEqual({ kind: 'note', message: expect.stringContaining("/Users/me/.bun/bin isn't on your PATH") });
  });

  it('removes the old skill symlink only when it points into this repo', () => {
    const ours = planInstall({ ...base, legacySkillTarget: `${repo}/skills/working-notes` });
    expect(ours).toContainEqual({ kind: 'remove', path: base.legacySkillPath });

    const theirs = planInstall({ ...base, legacySkillTarget: '/Users/me/code/working-notes-fork/skills/working-notes' });
    expect(theirs.some((s) => s.kind === 'remove')).toBe(false);
  });

  it('prints the commands, quoted, when claude is not on PATH', () => {
    const steps = planInstall({ ...base, repoDir: '/Users/me/My Code/working-notes', claude: null });
    expect(steps.some((s) => s.kind === 'claude')).toBe(false);
    const note = steps.find((s) => s.kind === 'note');
    expect(note?.kind === 'note' && note.message).toContain(`claude plugin marketplace add '/Users/me/My Code/working-notes'`);
    expect(note?.kind === 'note' && note.message).toContain(`claude plugin install ${PLUGIN_ID}`);
  });
});

describe('planUninstall', () => {
  it('uninstalls the plugin and marketplace and removes our pointer and PATH link', () => {
    expect(planUninstall(installed)).toEqual([
      { kind: 'claude', args: ['plugin', 'uninstall', PLUGIN_ID] },
      { kind: 'claude', args: ['plugin', 'marketplace', 'remove', 'working-notes'] },
      { kind: 'remove', path: '/data/app-path' },
      { kind: 'remove', path: '/Users/me/.bun/bin/wnotes' }
    ]);
  });

  it('keeps a pointer or link that another clone owns, and does nothing when nothing is installed', () => {
    expect(planUninstall({ ...base, pointer: '/elsewhere/working-notes', binLink: { kind: 'symlink', target: '/elsewhere/working-notes/bin/wnotes' } })).toEqual([]);
  });
});
