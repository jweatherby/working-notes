import { describe, it, expect } from 'vitest';
import { navLabels, profileFeatures } from '../profile';

describe('notebook profiles', () => {
  it('keeps everything in a work notebook', () => {
    expect(profileFeatures('work')).toEqual({ departments: true, orgLead: true, orgMap: true, goals: true, personalRelations: false, birthdays: false });
    expect(navLabels('work')).toEqual({ team: 'Team', teams: 'Teams', people: 'Org Map', wiki: 'Wiki' });
  });

  it('hides the org parts and renames four terms in a home notebook', () => {
    expect(profileFeatures('home')).toEqual({ departments: false, orgLead: false, orgMap: false, goals: false, personalRelations: true, birthdays: true });
    expect(navLabels('home')).toEqual({ team: 'Group', teams: 'Groups', people: 'People', wiki: 'Library' });
  });
});
