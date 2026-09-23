// Smoke test: the home dashboard surfaces todos, updates and the focus graph.

import { describe, it, expect } from 'vitest';
import { getRegistry } from '../../src/shared/registry.server';
import { createTeam } from '../../src/api/org/team/operations';
import { createTodo } from '../../src/api/aux/todo/operations';
import { addNote } from '../../src/api/aux/note/operations';
import { listOpenTodos, listRecentUpdates } from '../../src/api/home/operations';
import { getFocusGraph } from '../../src/api/home/focus-graph';
import { TEST_NOTEBOOK } from './test-notebooks';

describe('home smoke', () => {
  it('todos by priority, updates without people', async () => {
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

  });

  it('focus graph: one hop of links, grouped by how they read, archived left out', async () => {
    const reg = getRegistry(TEST_NOTEBOOK);
    const p = reg.prisma;

    const lead = await p.person.create({ data: { name: 'Focus Lead' } });
    await p.person.create({ data: { name: 'Focus Report', leadId: lead.id } });
    const gone = await p.person.create({ data: { name: 'Focus Gone', leadId: lead.id, archivedAt: new Date() } });
    const team = await p.team.create({ data: { name: 'Focus Team' } });
    await p.teamMember.create({ data: { teamId: team.id, personId: lead.id } });
    const project = await p.project.create({ data: { name: 'Focus Project', ownerType: 'PERSON', ownerId: lead.id } });
    const upstream = await p.project.create({ data: { name: 'Focus Upstream' } });
    await p.relation.create({ data: { fromType: 'PROJECT', fromId: project.id, toType: 'PROJECT', toId: upstream.id, kind: 'DEPENDS_ON' } });
    const goal = await p.goal.create({ data: { title: 'Focus Goal' } });
    await p.goalProject.create({ data: { goalId: goal.id, projectId: project.id } });
    await createTodo(reg, { title: 'Focus todo', entityType: 'PROJECT', entityId: project.id });

    const labelsOf = (graph: Awaited<ReturnType<typeof getFocusGraph>>) =>
      graph.ok ? Object.fromEntries(graph.value.groups.map((g) => [g.label, g.nodes.map((n) => n.label)])) : null;

    const person = await getFocusGraph(reg, { type: 'PERSON', id: lead.id });
    expect(person.ok && person.value.focus?.label).toBe('Focus Lead');
    expect(labelsOf(person)).toEqual({
      'Direct reports': ['Focus Report'],
      'Member of': ['Focus Team'],
      Owns: ['Focus Project']
    });
    expect(labelsOf(person)?.['Direct reports']).not.toContain(gone.name);

    // Attached todos are not neighbours; goal–project links read as dependencies.
    expect(labelsOf(await getFocusGraph(reg, { type: 'PROJECT', id: project.id }))).toEqual({
      'Owned by': ['Focus Lead'],
      'Depends on': ['Focus Upstream'],
      'Needed by': ['Focus Goal']
    });
    expect(labelsOf(await getFocusGraph(reg, { type: 'TEAM', id: team.id }))).toEqual({ Members: ['Focus Lead'] });

    const fallback = await getFocusGraph(reg);
    expect(fallback.ok && fallback.value.focus).not.toBeNull();

    const missing = await getFocusGraph(reg, { type: 'TEAM', id: 'no-such-team' });
    expect(missing.ok).toBe(false);
  });
});
