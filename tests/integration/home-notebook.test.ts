// What a home notebook leans on, against the real database: user-defined page
// kinds and their field changes, a kind's pages as a dataset, recurring todos,
// birthdays and personal relations.

import { beforeAll, describe, it, expect } from 'vitest';
import { getRegistry } from '../../src/shared/registry.server';
import { ensureDatabase } from '../../src/shared/db/bootstrap.server';
import { createPageKind, deletePageKind, listPageKinds, updatePageKind } from '../../src/api/page-kind/operations';
import { createPage, getPage, queryPages, updatePage } from '../../src/api/page/operations';
import { createTodo, listTodosForEntity, updateTodo } from '../../src/api/aux/todo/operations';
import { createPerson, getPerson } from '../../src/api/org/person/operations';
import { addRelation, listRelationsForEntity } from '../../src/api/relation/operations';
import { createProject } from '../../src/api/project/operations';
import { OTHER_NOTEBOOK } from './test-notebooks';

// The empty second notebook, so the kinds and people here start from nothing.
const reg = () => getRegistry(OTHER_NOTEBOOK);

beforeAll(async () => {
  await ensureDatabase(OTHER_NOTEBOOK);
});

const must = <T>(result: { ok: true; value: T } | { ok: false; error: Error }): T => {
  if (!result.ok) throw result.error;
  return result.value;
};

describe('page kinds as datasets', () => {
  it('kind → pages → query with filters, groups and totals → field changes → delete', async () => {
    const r = reg();
    const bad = await createPageKind(r, { key: 'expense', name: 'Expense' });
    expect(!bad.ok && bad.error.message).toContain("can't be a kind key");

    must(await createPageKind(r, {
      key: 'EXPENSE',
      name: 'Expense',
      fields: [
        { key: 'amount', label: 'Amount', input: 'number', format: 'money', currency: 'USD' },
        { key: 'frequency', label: 'Frequency', input: 'select', options: ['MONTHLY', 'YEARLY'] },
        { key: 'category', label: 'Category', input: 'select', options: ['Home', 'Fun', 'Car'] },
        { key: 'autopay', label: 'Autopay', input: 'checkbox' }
      ]
    }));
    expect((await createPageKind(r, { key: 'BILL', name: 'expense' })).ok).toBe(false);

    const unknown = await createPage(r, { title: 'x', kind: 'RECIPE' });
    expect(!unknown.ok && unknown.error.message).toContain('Kinds: GENERAL, EXPENSE');

    const rent = must(await createPage(r, { title: 'Rent', kind: 'EXPENSE', properties: { amount: 1500, frequency: 'MONTHLY', category: 'Home', autopay: true } }));
    must(await createPage(r, { title: 'Netflix', kind: 'EXPENSE', properties: { amount: 15.5, frequency: 'MONTHLY', category: 'Fun' } }));
    must(await createPage(r, { title: 'Car insurance', kind: 'EXPENSE', properties: { amount: 900, frequency: 'YEARLY', category: 'Car' } }));

    const monthly = must(await queryPages(r, { kind: 'EXPENSE', filters: ['frequency:is:MONTHLY'], sort: 'amount:asc', aggregates: ['amount:sum'] }));
    expect(monthly.pages.map((p) => p.title)).toEqual(['Netflix', 'Rent']);
    expect(monthly.totals).toEqual({ 'amount:sum': 1515.5 });

    const grouped = must(await queryPages(r, { kind: 'EXPENSE', groupBy: 'frequency', aggregates: ['amount:max'] }));
    expect(grouped.groups?.map((g) => [g.value, g.count, g.totals['amount:max']])).toEqual([['MONTHLY', 2, 1500], ['YEARLY', 1, 900]]);
    const badQuery = await queryPages(r, { kind: 'EXPENSE', filters: ['colour:is:red'] });
    expect(!badQuery.ok && badQuery.error.message).toContain('there is no field "colour"');

    const dropOption = await updatePageKind(r, 'EXPENSE', {
      fields: [
        { key: 'amount', label: 'Amount', input: 'number', format: 'money', currency: 'USD' },
        { key: 'frequency', label: 'Frequency', input: 'select', options: ['MONTHLY'] },
        { key: 'category', label: 'Category', input: 'select', options: ['Home', 'Fun', 'Car'] },
        { key: 'autopay', label: 'Autopay', input: 'checkbox' }
      ]
    });
    expect(!dropOption.ok && dropOption.error.message).toContain('"Car insurance"');

    const dropField = must(await updatePageKind(r, 'EXPENSE', {
      fields: [
        { key: 'amount', label: 'Amount', input: 'number', format: 'money', currency: 'USD' },
        { key: 'frequency', label: 'Frequency', input: 'select', options: ['MONTHLY', 'YEARLY', 'QUARTERLY'] },
        { key: 'category', label: 'Categories', input: 'multiselect', options: ['Home', 'Fun', 'Car'] }
      ]
    }));
    expect(dropField.removedFields).toEqual(['autopay']);
    expect(must(await getPage(r, rent.id)).properties).toEqual({ amount: 1500, frequency: 'MONTHLY', category: ['Home'] });
    expect((await updatePage(r, rent.id, { properties: { category: ['Home', 'Fun'] } })).ok).toBe(true);

    const refused = await deletePageKind(r, 'EXPENSE');
    expect(!refused.ok && refused.error.message).toContain('3 page(s) are EXPENSE');
    expect(must(await deletePageKind(r, 'EXPENSE', 'GENERAL')).pagesMoved).toBe(3);
    expect(must(await getPage(r, rent.id))).toMatchObject({ kind: 'GENERAL', properties: {} });
    expect(must(await listPageKinds(r)).map((k) => k.key)).toEqual(['GENERAL']);
  });
});

describe('recurring todos', () => {
  it('completing one adds the next, due one interval later, and moves the recurrence to it', async () => {
    const r = reg();
    const project = must(await createProject(r, { name: 'Car' }));
    const todo = must(await createTodo(r, {
      title: 'Renew car insurance', entityType: 'PROJECT', entityId: project.id,
      targetDate: new Date('2026-03-01T00:00:00Z'), recurrence: 'YEARLY'
    }));
    const done = must(await updateTodo(r, todo.id, { status: 'COMPLETE' }));
    expect(done.nextId).toBeDefined();

    const todos = await listTodosForEntity(r, 'PROJECT', project.id);
    const next = todos.find((t) => t.id === done.nextId);
    expect(next).toMatchObject({ title: 'Renew car insurance', status: 'PENDING', recurrence: 'YEARLY' });
    expect(next?.targetDate?.toISOString().slice(0, 10)).toBe('2027-03-01');
    expect(todos.find((t) => t.id === todo.id)).toMatchObject({ status: 'COMPLETE', recurrence: null });
  });
});

describe('people at home', () => {
  it('keeps birthdays and personal relations, which link only people', async () => {
    const r = reg();
    const sam = must(await createPerson(r, { name: 'Sam', birthday: '--05-03' }));
    const alex = must(await createPerson(r, { name: 'Alex', birthday: '1990-01-31' }));
    expect(must(await getPerson(r, sam.id)).birthday).toBe('--05-03');

    must(await addRelation(r, { fromType: 'PERSON', fromId: sam.id, toType: 'PERSON', toId: alex.id, kind: 'SIBLING_OF' }));
    const again = await addRelation(r, { fromType: 'PERSON', fromId: alex.id, toType: 'PERSON', toId: sam.id, kind: 'SIBLING_OF' });
    expect(again.ok).toBe(false);
    must(await addRelation(r, { fromType: 'PERSON', fromId: sam.id, toType: 'PERSON', toId: alex.id, kind: 'PARENT_OF' }));

    const fromAlex = must(await listRelationsForEntity(r, 'PERSON', alex.id));
    expect(fromAlex.map((g) => g.label)).toEqual(['Child of', 'Sibling of']);

    const project = must(await createProject(r, { name: 'Garden' }));
    const wrong = await addRelation(r, { fromType: 'PERSON', fromId: sam.id, toType: 'PROJECT', toId: project.id, kind: 'FRIEND_OF' });
    expect(!wrong.ok && wrong.error.message).toContain('FRIEND_OF links two people');
  });
});
