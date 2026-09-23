// Home dashboard: recent updates and the focus graph.

import type { RelatableType } from './enums';

export const UPDATE_KINDS = [
  'PERSON',
  'TEAM',
  'DEPARTMENT',
  'PROJECT',
  'GOAL',
  'PAGE',
  'DOC',
  'NOTE',
  'REPORT',
  'TODO'
] as const;

export type UpdateKind = (typeof UPDATE_KINDS)[number];

export interface RecentUpdate {
  readonly kind: UpdateKind;
  readonly id: string;
  readonly title: string;
  readonly parentLabel: string | null;
  readonly href: string;
  readonly at: Date;
  readonly isNew: boolean;
}

// The focus graph: one entity in the middle and everything one link away,
// grouped by how each link reads from the middle ("Reports to", "Owns").

/** Types that can sit in the middle of the focus graph. */
export const FOCUS_TYPES = ['PERSON', 'TEAM', 'DEPARTMENT', 'PROJECT', 'GOAL', 'PAGE'] as const;

export type FocusType = (typeof FOCUS_TYPES)[number];

export interface FocusNode {
  readonly id: string;
  readonly type: RelatableType;
  readonly label: string;
  readonly href: string;
  /** Whether it can be the middle; a doc, note, todo or report only opens. */
  readonly focusable: boolean;
}

export interface FocusGroup {
  readonly label: string;
  readonly nodes: readonly FocusNode[];
  /** Neighbours left out of this group by the cap. */
  readonly more: number;
}

export interface FocusGraph {
  readonly focus: FocusNode | null;
  readonly groups: readonly FocusGroup[];
}
