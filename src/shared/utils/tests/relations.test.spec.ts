import { describe, it, expect } from 'vitest';
import { BUILTIN_RELATION_KINDS } from '$shared/types/relations';
import { choiceIsPeopleOnly, relationChoices, relationEnd, toRelationInput } from '../relations';

const team = { entityType: 'GROUP', entityId: 't1' } as const;
const project = { entityType: 'PROJECT', entityId: 'p1' } as const;

const PARENT = { key: 'PARENT_OF', label: 'Parent of', inverseLabel: 'Child of', symmetric: false, peopleOnly: true, exclusive: false, sortOrder: 0, builtIn: false };
const FRIEND = { key: 'FRIEND_OF', label: 'Friend of', inverseLabel: 'Friend of', symmetric: true, peopleOnly: true, exclusive: false, sortOrder: 1, builtIn: false };
const kinds = [...BUILTIN_RELATION_KINDS, PARENT, FRIEND];

describe('relationChoices', () => {
  it('offers RELATED once and DEPENDS_ON from both sides, never MENTIONS', () => {
    expect(relationChoices(BUILTIN_RELATION_KINDS, 'PROJECT')).toEqual([
      { id: 'RELATED:out', name: 'Related to' },
      { id: 'DEPENDS_ON:out', name: 'Depends on' },
      { id: 'DEPENDS_ON:in', name: 'Needed by' }
    ]);
  });

  it('adds people-only kinds on a person: an asymmetric kind from both sides, a symmetric one once', () => {
    expect(relationChoices(kinds, 'PERSON').map((c) => c.id)).toEqual([
      'RELATED:out', 'DEPENDS_ON:out', 'DEPENDS_ON:in', 'PARENT_OF:out', 'PARENT_OF:in', 'FRIEND_OF:out'
    ]);
    expect(relationChoices(kinds, 'GROUP').map((c) => c.id)).toEqual(['RELATED:out', 'DEPENDS_ON:out', 'DEPENDS_ON:in']);
  });

  it('knows which choices need a person', () => {
    expect(choiceIsPeopleOnly(kinds, 'PARENT_OF:in')).toBe(true);
    expect(choiceIsPeopleOnly(kinds, 'RELATED:out')).toBe(false);
  });
});

describe('toRelationInput', () => {
  it('points a forward choice from this entity to the target', () => {
    expect(toRelationInput('DEPENDS_ON:out', team, project)).toEqual({
      fromType: 'GROUP', fromId: 't1', toType: 'PROJECT', toId: 'p1', kind: 'DEPENDS_ON'
    });
  });

  it('swaps the ends for an inverse choice', () => {
    expect(toRelationInput('DEPENDS_ON:in', team, project)).toEqual({
      fromType: 'PROJECT', fromId: 'p1', toType: 'GROUP', toId: 't1', kind: 'DEPENDS_ON'
    });
  });

  it('refuses choices it cannot read', () => {
    expect(toRelationInput('MENTIONS:out', team, project)).toBeNull();
    expect(toRelationInput('uses:out', team, project)).toBeNull();
    expect(toRelationInput('RELATED:in', team, project)).toBeNull();
    expect(toRelationInput('FRIEND_OF:in', team, project, kinds)).toBeNull();
    expect(toRelationInput('DEPENDS_ON', team, project)).toBeNull();
  });
});

describe('toRelationInput with notebook kinds', () => {
  it('reads an inverse choice of a notebook kind', () => {
    const me = { entityType: 'PERSON', entityId: 'me' } as const;
    const mom = { entityType: 'PERSON', entityId: 'mom' } as const;
    expect(toRelationInput('PARENT_OF:in', me, mom, kinds)).toEqual({
      fromType: 'PERSON', fromId: 'mom', toType: 'PERSON', toId: 'me', kind: 'PARENT_OF'
    });
  });
});

describe('relationEnd', () => {
  it('accepts relatable types only', () => {
    expect(relationEnd('GROUP', 't1')).toEqual(team);
    expect(relationEnd('TODO', 'x1')).toEqual({ entityType: 'TODO', entityId: 'x1' });
    expect(relationEnd('LINK', 'l1')).toBeNull();
    expect(relationEnd('GROUP', '')).toBeNull();
  });
});
