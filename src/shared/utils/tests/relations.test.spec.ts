import { describe, it, expect } from 'vitest';
import { relationChoices, relationEnd, toRelationInput } from '../relations';

const team = { entityType: 'TEAM', entityId: 't1' } as const;
const project = { entityType: 'PROJECT', entityId: 'p1' } as const;

describe('relationChoices', () => {
  it('offers RELATED once and DEPENDS_ON from both sides', () => {
    expect(relationChoices()).toEqual([
      { id: 'RELATED:out', name: 'Related to' },
      { id: 'DEPENDS_ON:out', name: 'Depends on' },
      { id: 'DEPENDS_ON:in', name: 'Needed by' }
    ]);
  });
});

describe('toRelationInput', () => {
  it('points a forward choice from this entity to the target', () => {
    expect(toRelationInput('DEPENDS_ON:out', team, project)).toEqual({
      fromType: 'TEAM', fromId: 't1', toType: 'PROJECT', toId: 'p1', kind: 'DEPENDS_ON'
    });
  });

  it('swaps the ends for an inverse choice', () => {
    expect(toRelationInput('DEPENDS_ON:in', team, project)).toEqual({
      fromType: 'PROJECT', fromId: 'p1', toType: 'TEAM', toId: 't1', kind: 'DEPENDS_ON'
    });
  });

  it('refuses choices it cannot read', () => {
    expect(toRelationInput('MENTIONS:out', team, project)).toBeNull();
    expect(toRelationInput('USES:out', team, project)).toBeNull();
    expect(toRelationInput('RELATED:in', team, project)).toBeNull();
    expect(toRelationInput('DEPENDS_ON', team, project)).toBeNull();
  });
});

describe('relationEnd', () => {
  it('accepts relatable types only', () => {
    expect(relationEnd('TEAM', 't1')).toEqual(team);
    expect(relationEnd('TODO', 'x1')).toBeNull();
    expect(relationEnd('TEAM', '')).toBeNull();
  });
});
