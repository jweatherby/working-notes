// Smoke test: the home dashboard surfaces todos, updates and the project graph.

import { describe, it, expect } from 'vitest';
import { getRegistry } from '../../src/shared/registry.server';
import { createTeam } from '../../src/api/org/team/operations';
import { createTodo } from '../../src/api/aux/todo/operations';
import { addNote } from '../../src/api/aux/note/operations';
import { getRelationGraph, listOpenTodos, listRecentUpdates } from '../../src/api/home/operations';
import { TEST_NOTEBOOK } from './test-notebooks';

describe('home smoke', () => {
  it('todos by priority, updates without people, project-centred graph', async () => {
    const reg = getRegistry(TEST_NOTEBOOK);

    const team = await createTeam(reg, { name: 'Home Feed Team' });
    expect(team.ok).toBe(true);
    if (!team.ok) return;
    await addNote(reg, 'PERSON', 'person_alice', { content: 'Private person note' });

    await createTodo(reg, { title: 'Low', priority: 0, entityType: 'PERSON', entityId: 'person_alice' });
    await createTodo(reg, { title: 'Urgent', priority: 3, entityType: 'PERSON', entityId: 'person_alice' });

    const todos = await listOpenTodos(reg);
    expect(todos.ok && todos.value[0]?.title).toBe('Urgent');

    const updates = await listRecentUpdates(reg);
    expect(updates.ok).toBe(true);
    if (!updates.ok) return;
    expect(updates.value.some((u) => u.kind === 'TEAM' && u.id === team.value.id)).toBe(true);
    expect(updates.value.some((u) => u.kind === 'PERSON')).toBe(false);
    expect(updates.value.some((u) => u.kind === 'NOTE' && u.title === 'Private person note')).toBe(false);

    const project = await reg.prisma.project.create({ data: { name: 'Home Graph Project' } });
    await createTodo(reg, { title: 'Project todo', entityType: 'PROJECT', entityId: project.id });

    const graph = await getRelationGraph(reg);
    expect(graph.ok).toBe(true);
    if (!graph.ok) return;
    expect(graph.value.nodes.some((n) => n.type === 'PROJECT' && n.id === project.id)).toBe(true);
    expect(graph.value.edges.some((e) => e.kind === 'TODO' && e.target === project.id)).toBe(true);
    expect(graph.value.nodes.some((n) => (n.type as string) === 'PERSON')).toBe(false);
  });
});
