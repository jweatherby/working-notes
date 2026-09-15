import { describe, it, expect } from 'vitest';
import { buildGraph, mergeUpdates, summarizeContent } from '../operations';

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

describe('buildGraph', () => {
  it('is empty without projects', () => {
    const graph = buildGraph({
      projects: [],
      docs: [{ id: 'd1', title: 'Orphan', entityId: 'gone' }],
      reports: [],
      todos: []
    });
    expect(graph).toEqual({ nodes: [], edges: [] });
  });

  it('drops nodes with no links', () => {
    const graph = buildGraph({
      projects: [
        { id: 'pr1', name: 'Alone', parentId: null },
        { id: 'pr2', name: 'Linked', parentId: null }
      ],
      docs: [{ id: 'd1', title: 'Spec', entityId: 'pr2' }],
      reports: [],
      todos: []
    });
    expect(graph.nodes.map((n) => n.id)).toEqual(['pr2', 'd1']);
  });

  it('centres on projects and drops assets of missing projects', () => {
    const graph = buildGraph({
      projects: [
        { id: 'pr1', name: 'Root', parentId: null },
        { id: 'pr2', name: 'Child', parentId: 'pr1' }
      ],
      docs: [
        { id: 'd1', title: 'Spec', entityId: 'pr1' },
        { id: 'd2', title: 'Orphan', entityId: 'gone' }
      ],
      reports: [{ id: 'r1', title: 'Q3', entityId: 'pr2' }],
      todos: [{ id: 't1', title: 'Ship', entityId: 'pr2' }]
    });

    expect(graph.nodes.map((n) => n.id)).toEqual(['pr1', 'pr2', 'd1', 'r1', 't1']);
    expect(graph.nodes.find((n) => n.id === 't1')?.href).toBe('/app/projects/pr2?popup=todo&todo=t1');
    expect(graph.edges).toEqual([
      { source: 'pr2', target: 'pr1', kind: 'SUBPROJECT' },
      { source: 'd1', target: 'pr1', kind: 'DOC' },
      { source: 'r1', target: 'pr2', kind: 'REPORT' },
      { source: 't1', target: 'pr2', kind: 'TODO' }
    ]);
  });
});
