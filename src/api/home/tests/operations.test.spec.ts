import { describe, it, expect } from 'vitest';
import { mergeUpdates, summarizeContent } from '../operations';
import { buildFocusGraph, focusNode } from '../focus-graph';

const d = (iso: string): Date => new Date(iso);

describe('mergeUpdates', () => {
  it('sorts newest first across groups and caps at limit', () => {
    const mk = (id: string, at: string) => ({
      kind: 'NOTE' as const, id, title: id, parent: null, createdAt: d(at), updatedAt: d(at)
    });
    const merged = mergeUpdates([[mk('a', '2026-01-01'), mk('c', '2026-01-03')], [mk('b', '2026-01-02')]], 2);
    expect(merged.map((u) => u.id)).toEqual(['c', 'b']);
  });
});

describe('summarizeContent', () => {
  it('takes the first non-empty line without markdown markers', () => {
    expect(summarizeContent('\n## Hello world\nmore')).toBe('Hello world');
  });
  it('truncates long lines', () => {
    expect(summarizeContent('x'.repeat(100), 10)).toBe(`${'x'.repeat(9)}…`);
  });
});

describe('buildFocusGraph', () => {
  const focus = focusNode('PERSON', 'p1', 'Alice');
  const node = (type: 'PERSON' | 'TEAM' | 'PROJECT' | 'DOC', id: string, label: string) => focusNode(type, id, label);

  it('groups links in reading order, each sorted by name', () => {
    const graph = buildFocusGraph(focus, [
      { label: 'Related to', node: node('PROJECT', 'pr1', 'Zeta') },
      { label: 'Owns', node: node('PROJECT', 'pr2', 'Beta') },
      { label: 'Owns', node: node('PROJECT', 'pr3', 'Alpha') },
      { label: 'Reports to', node: node('PERSON', 'p2', 'Bob') },
      { label: 'Something new', node: node('TEAM', 't1', 'Core') }
    ]);
    expect(graph.groups.map((g) => g.label)).toEqual(['Reports to', 'Owns', 'Related to', 'Something new']);
    expect(graph.groups[1]?.nodes.map((n) => n.label)).toEqual(['Alpha', 'Beta']);
  });

  it('shows an entity once per label and never the focus itself', () => {
    const graph = buildFocusGraph(focus, [
      { label: 'Related to', node: node('PROJECT', 'pr1', 'Zeta') },
      { label: 'Related to', node: node('PROJECT', 'pr1', 'Zeta') },
      { label: 'Depends on', node: node('PROJECT', 'pr1', 'Zeta') },
      { label: 'Related to', node: focus }
    ]);
    expect(graph.groups.map((g) => [g.label, g.nodes.length])).toEqual([['Depends on', 1], ['Related to', 1]]);
  });

  it('caps each group and counts the rest', () => {
    const many = Array.from({ length: 11 }, (_, i) => ({ label: 'Direct reports', node: node('PERSON', `r${i}`, `R${i}`) }));
    const graph = buildFocusGraph(focus, many, 8);
    expect(graph.groups[0]?.nodes).toHaveLength(8);
    expect(graph.groups[0]?.more).toBe(3);
  });

  it('marks only top-level entities as focusable', () => {
    expect(node('DOC', 'd1', 'Spec').focusable).toBe(false);
    expect(node('TEAM', 't1', 'Core').focusable).toBe(true);
    expect(node('TEAM', 't1', 'Core').href).toBe('/app/teams/t1');
  });

  it('is empty without links', () => {
    expect(buildFocusGraph(focus, [])).toEqual({ focus, groups: [] });
  });
});
