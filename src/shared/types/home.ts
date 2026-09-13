// Home dashboard: recent updates and the entity relation graph.

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

// The graph is oriented around projects: projects are hubs, with their
// sub-projects and the docs, reports and todos attached to them.
export const GRAPH_NODE_TYPES = ['PROJECT', 'DOC', 'REPORT', 'TODO'] as const;

export type GraphNodeType = (typeof GRAPH_NODE_TYPES)[number];

export interface GraphNode {
  readonly id: string;
  readonly type: GraphNodeType;
  readonly label: string;
  readonly href: string;
}

export type GraphEdgeKind = 'SUBPROJECT' | 'DOC' | 'REPORT' | 'TODO';

export interface GraphEdge {
  readonly source: string;
  readonly target: string;
  readonly kind: GraphEdgeKind;
}

export interface RelationGraph {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
}
