import { describe, it, expect } from 'vitest';
import { hiddenEntityTypes, navLabels, profileFeatures } from '../profile';

describe('notebook profiles', () => {
  it('keeps everything in a work notebook', () => {
    expect(profileFeatures('work')).toEqual({ departments: true, orgLead: true, orgMap: true, goals: true, personalRelations: false, birthdays: false });
    expect(navLabels('work')).toEqual({ team: 'Team', teams: 'Teams', people: 'Org Map' });
  });

  it('hides the org parts and renames three terms in a home notebook', () => {
    expect(profileFeatures('home')).toEqual({ departments: false, orgLead: false, orgMap: false, goals: false, personalRelations: true, birthdays: true });
    expect(navLabels('home')).toEqual({ team: 'Group', teams: 'Groups', people: 'People' });
  });

  it('hides goals and departments from pickers only in a home notebook', () => {
    expect([...hiddenEntityTypes('work')]).toEqual([]);
    expect([...hiddenEntityTypes('home')].sort()).toEqual(['DEPARTMENT', 'GOAL']);
  });
});
