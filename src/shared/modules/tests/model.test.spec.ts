import { describe, it, expect } from 'vitest';
import { notebookModel } from '../model';

describe('notebookModel', () => {
  it('gives a work notebook the org chart and goals', () => {
    const work = notebookModel('work');
    expect(work.modules).toEqual(['org', 'goals']);
    expect(work.nav.map((n) => n.label)).toEqual(['Home', 'Org Map', 'Projects', 'Goals', 'Wiki', 'Todos']);
    expect(work.shows('GOAL')).toBe(true);
    expect(work.personFields.map((f) => f.key)).toEqual(['title', 'leadId']);
    expect(work.groupKinds.map((k) => [k.key, k.exclusive])).toEqual([['TEAM', false], ['DEPARTMENT', true]]);
    expect(work.relationKinds).toEqual([]);
    expect(work.routeOwner('/app/goals/g1')).toBeNull();
    expect(work.procedureOwner('goal.create')).toBeNull();
  });

  it('gives a home notebook personal life and no goals', () => {
    const home = notebookModel('home');
    expect(home.nav.map((n) => n.label)).toEqual(['Home', 'People', 'Groups', 'Projects', 'Wiki', 'Todos']);
    expect(home.shows('GOAL')).toBe(false);
    expect(home.shows('GROUP')).toBe(true);
    expect(home.personFields.map((f) => f.key)).toEqual(['knownAs', 'birthday']);
    expect(home.relationKinds).toContain('SIBLING_OF');
    expect(home.homeWidgets).toEqual(['birthdays']);
    expect(home.routeOwner('/app/goals')).toBe('goals');
    expect(home.routeOwner('/app/orgmap')).toBe('org');
    expect(home.routeOwner('/app/goalsx')).toBeNull();
    expect(home.procedureOwner('goal.create')).toBe('goals');
    expect(home.procedureOwner('group.create')).toBeNull();
  });
});
