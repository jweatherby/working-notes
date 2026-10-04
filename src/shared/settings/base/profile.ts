// What a notebook's profile changes. Client-safe and pure. A home notebook hides
// the org-only parts and renames four terms in the nav and page headings; field
// labels, forms and the API stay the same in every notebook.

import type { NotebookProfile } from '$shared/types/notebook';

export interface ProfileFeatures {
  /** The Departments pages, finder entry and person field. Data and router stay. */
  readonly departments: boolean;
  /** A person's lead (who they report to) and reports. */
  readonly orgLead: boolean;
  /** The Org Map page; home links People instead. */
  readonly orgMap: boolean;
  /** Partner, parent, sibling and friend relations between people. */
  readonly personalRelations: boolean;
  /** The home page's upcoming birthdays. */
  readonly birthdays: boolean;
}

export const profileFeatures = (profile: NotebookProfile): ProfileFeatures => ({
  departments: profile === 'work',
  orgLead: profile === 'work',
  orgMap: profile === 'work',
  personalRelations: profile === 'home',
  birthdays: profile === 'home'
});

export interface NavLabels {
  readonly team: string;
  readonly teams: string;
  readonly people: string;
  readonly wiki: string;
}

export const navLabels = (profile: NotebookProfile): NavLabels =>
  profile === 'home'
    ? { team: 'Group', teams: 'Groups', people: 'People', wiki: 'Library' }
    : { team: 'Team', teams: 'Teams', people: 'Org Map', wiki: 'Wiki' };
