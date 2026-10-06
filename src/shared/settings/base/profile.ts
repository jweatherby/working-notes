// What a notebook's profile changes. Client-safe and pure. A home notebook hides
// goals and the org-only parts and renames three terms in the nav and page headings; field
// labels, forms and the API stay the same in every notebook.

import type { NotebookProfile } from '$shared/types/notebook';
import type { RelatableType } from '$shared/types/enums';

export interface ProfileFeatures {
  /** The Departments pages, finder entry and person field. Data and router stay. */
  readonly departments: boolean;
  /** A person's lead (who they report to) and reports. */
  readonly orgLead: boolean;
  /** The Org Map page; home links People instead. */
  readonly orgMap: boolean;
  /** Goals: the nav link, the finder entry, /app/goals, owned goals and the home graph. Data and router stay. */
  readonly goals: boolean;
  /** Partner, parent, sibling and friend relations between people. */
  readonly personalRelations: boolean;
  /** The home page's upcoming birthdays. */
  readonly birthdays: boolean;
}

export const profileFeatures = (profile: NotebookProfile): ProfileFeatures => ({
  departments: profile === 'work',
  orgLead: profile === 'work',
  orgMap: profile === 'work',
  goals: profile === 'work',
  personalRelations: profile === 'home',
  birthdays: profile === 'home'
});

/** Entity types the profile hides from pickers, the finder and Related lists. */
export const hiddenEntityTypes = (profile: NotebookProfile): ReadonlySet<RelatableType> => {
  const flags = profileFeatures(profile);
  return new Set<RelatableType>([...(flags.goals ? [] : ['GOAL' as const]), ...(flags.departments ? [] : ['DEPARTMENT' as const])]);
};

export interface NavLabels {
  readonly team: string;
  readonly teams: string;
  readonly people: string;
}

export const navLabels = (profile: NotebookProfile): NavLabels =>
  profile === 'home'
    ? { team: 'Group', teams: 'Groups', people: 'People' }
    : { team: 'Team', teams: 'Teams', people: 'Org Map' };
