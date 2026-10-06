import { describe, it, expect } from 'vitest';
import { relationChoices, relationEnd, toRelationInput } from '../relations';

const team = { entityType: 'GROUP', entityId: 't1' } as const;
const project = { entityType: 'PROJECT', entityId: 'p1' } as const;

describe('relationChoices', () => {
  it('offers RELATED once and DEPENDS_ON from both sides', () => {
    expect(relationChoices()).toEqual([
      { id: 'RELATED:out', name: 'Related to' },
      { id: 'DEPENDS_ON:out', name: 'Depends on' },
      { id: 'DEPENDS_ON:in', name: 'Needed by' }
    ]);
  });

  it('adds the personal kinds when asked: parent from both sides, the rest once', () => {
    expect(relationChoices(['PARTNER_OF', 'PARENT_OF', 'SIBLING_OF', 'FRIEND_OF']).map((c) => c.id)).toEqual([
      'RELATED:out', 'DEPENDS_ON:out', 'DEPENDS_ON:in',
      'PARTNER_OF:out', 'PARENT_OF:out', 'PARENT_OF:in', 'SIBLING_OF:out', 'FRIEND_OF:out'
    ]);
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
    expect(toRelationInput('USES:out', team, project)).toBeNull();
    expect(toRelationInput('RELATED:in', team, project)).toBeNull();
    expect(toRelationInput('SIBLING_OF:in', team, project)).toBeNull();
    expect(toRelationInput('DEPENDS_ON', team, project)).toBeNull();
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
