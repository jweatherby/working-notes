import { describe, it, expect, vi } from 'vitest';
import { createTestRegistry } from '$shared/registry.test';
import type { Registry } from '$shared/registry';
import { findLinks } from '../operations';
import { linkSearchKey, normalizeLinkUrl } from '../url';

describe('normalizeLinkUrl', () => {
  it('ignores protocol, www, host case, trailing slash, fragment and tracking parameters', () => {
    const forms = [
      'https://linear.app/acme/issue/ENG-123/fix-login',
      'http://www.Linear.app/acme/issue/ENG-123/fix-login/',
      'https://linear.app/acme/issue/ENG-123/fix-login#comment-4',
      'https://linear.app/acme/issue/ENG-123/fix-login?utm_source=slack'
    ];
    expect(new Set(forms.map(normalizeLinkUrl))).toEqual(new Set(['linear.app/acme/issue/ENG-123/fix-login']));
  });

  it('keeps meaningful query parameters, in a stable order', () => {
    expect(normalizeLinkUrl('https://example.com/view?b=2&a=1')).toBe('example.com/view?a=1&b=2');
    expect(normalizeLinkUrl('https://example.com/view?id=1')).not.toBe(normalizeLinkUrl('https://example.com/view?id=2'));
  });

  it('keeps path case, and leaves text that is not a URL as it is', () => {
    expect(normalizeLinkUrl('https://notion.so/Roadmap-abc')).not.toBe(normalizeLinkUrl('https://notion.so/roadmap-abc'));
    expect(normalizeLinkUrl('  ENG-123 ')).toBe('ENG-123');
  });
});

describe('linkSearchKey', () => {
  it('uses the path, or the host when there is none', () => {
    expect(linkSearchKey('https://www.notion.so/acme/Roadmap-abc/?pvs=4')).toBe('/acme/Roadmap-abc');
    expect(linkSearchKey('https://Example.com/')).toBe('example.com');
  });
});

describe('findLinks', () => {
  const row = (id: string, url: string, entityId: string) => ({
    id, url, title: null, createdAt: new Date(0), entityType: 'PROJECT', entityId
  });

  const registry = (rows: readonly ReturnType<typeof row>[]) => {
    const findMany = vi.fn().mockResolvedValue(rows);
    const reg = createTestRegistry({
      prisma: {
        link: { findMany },
        project: {
          findUnique: vi.fn(({ where }: { where: { id: string } }) =>
            Promise.resolve(where.id === 'gone' ? null : { name: `Project ${where.id}` }))
        }
      } as unknown as Registry['prisma']
    });
    return { reg, findMany };
  };

  it('needs a url or text to look for', async () => {
    const { reg } = registry([]);
    const result = await findLinks(reg, {});
    expect(!result.ok && result.error.message).toContain('--url');
  });

  it('matches a URL however it was written, and names the entity', async () => {
    const { reg, findMany } = registry([
      row('l1', 'http://www.linear.app/acme/issue/ENG-123/fix-login/', 'p1'),
      row('l2', 'https://linear.app/acme/issue/ENG-123/fix-login-sub', 'p2')
    ]);
    const result = await findLinks(reg, { url: 'https://linear.app/acme/issue/ENG-123/fix-login' });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { url: { contains: '/acme/issue/ENG-123/fix-login' } }
    }));
    expect(result.ok && result.value.map((m) => [m.id, m.label, m.path])).toEqual([
      ['l1', 'Project p1', '/app/projects/p1']
    ]);
  });

  it('with contains, returns every link containing the text, skipping deleted entities', async () => {
    const { reg, findMany } = registry([
      row('l1', 'https://linear.app/acme/issue/ENG-123/old-title', 'p1'),
      row('l2', 'https://linear.app/acme/issue/ENG-123/new-title', 'gone')
    ]);
    const result = await findLinks(reg, { contains: 'ENG-123' });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { url: { contains: 'ENG-123' } } }));
    expect(result.ok && result.value.map((m) => m.id)).toEqual(['l1']);
  });
});
