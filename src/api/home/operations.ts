import type { Registry } from '$shared/registry';
import { ok, type Result } from '$shared/utils';
import type { EntityType, TodoStatus } from '$shared/types/enums';
import type {
  GraphEdge,
  GraphNode,
  RecentUpdate,
  RelationGraph,
  UpdateKind
} from '$shared/types/home';
import { docPath, entityPath } from '$shared/utils/entity';
import { features } from '$shared/settings/base/features';
import { resolveEntityLabel } from '$api/_entity-labels';
import { loadArchivedIds, notAttachedToArchived } from '$api/_archive';
import type { TodoSummary } from '$api/aux/todo/operations';

// ----- Pure helpers -----

interface RawUpdate {
  readonly kind: UpdateKind;
  readonly id: string;
  readonly title: string;
  readonly parent: { readonly entityType: EntityType; readonly entityId: string } | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Newest first, capped at `limit`. */
export const mergeUpdates = (
  groups: readonly (readonly RawUpdate[])[],
  limit: number
): readonly RawUpdate[] =>
  groups
    .flat()
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, limit);

/** First non-empty line of markdown, stripped of heading/list markers, truncated. */
export const summarizeContent = (content: string, max = 80): string => {
  const line = content
    .split('\n')
    .map((l) => l.replace(/^[#>*\-\s]+/, '').trim())
    .find((l) => l.length > 0) ?? '';
  return line.length > max ? `${line.slice(0, max - 1)}…` : line || '(empty)';
};

const updateHref = (u: RawUpdate): string => {
  switch (u.kind) {
    case 'PERSON':
    case 'TEAM':
    case 'DEPARTMENT':
    case 'PROJECT':
    case 'GOAL':
    case 'PAGE':
    case 'REPORT':
      return entityPath(u.kind, u.id);
    case 'TODO':
      return u.parent
        ? `${entityPath(u.parent.entityType, u.parent.entityId)}?popup=todo&todo=${u.id}`
        : `/app/todos?popup=todo&todo=${u.id}`;
    case 'DOC':
      return u.parent ? docPath(u.parent.entityType, u.parent.entityId, u.id) : '/app';
    default:
      return u.parent ? entityPath(u.parent.entityType, u.parent.entityId) : '/app';
  }
};

interface ProjectAsset {
  readonly id: string;
  readonly title: string;
  readonly entityId: string;
}

interface GraphSource {
  readonly projects: readonly {
    readonly id: string;
    readonly name: string;
    readonly parentId: string | null;
  }[];
  readonly docs: readonly ProjectAsset[];
  readonly reports: readonly ProjectAsset[];
  readonly todos: readonly ProjectAsset[];
}

/**
 * Project-centred graph: projects, sub-project links, and the docs, reports and
 * todos attached to each project. Empty when there are no projects. Assets whose
 * project is missing are dropped.
 */
export const buildGraph = (src: GraphSource): RelationGraph => {
  if (src.projects.length === 0) return { nodes: [], edges: [] };

  const projectIds = new Set(src.projects.map((p) => p.id));
  const attached = (assets: readonly ProjectAsset[]) => assets.filter((a) => projectIds.has(a.entityId));
  const docs = attached(src.docs);
  const reports = attached(src.reports);
  const todos = attached(src.todos);

  const nodes: GraphNode[] = [
    ...src.projects.map((p) => ({ id: p.id, type: 'PROJECT' as const, label: p.name, href: entityPath('PROJECT', p.id) })),
    ...docs.map((d) => ({ id: d.id, type: 'DOC' as const, label: d.title, href: docPath('PROJECT', d.entityId, d.id) })),
    ...reports.map((r) => ({ id: r.id, type: 'REPORT' as const, label: r.title, href: entityPath('REPORT', r.id) })),
    ...todos.map((t) => ({
      id: t.id,
      type: 'TODO' as const,
      label: t.title,
      href: `${entityPath('PROJECT', t.entityId)}?popup=todo&todo=${t.id}`
    }))
  ];

  const edges: GraphEdge[] = [
    ...src.projects.flatMap((p) =>
      p.parentId && projectIds.has(p.parentId) ? [{ source: p.id, target: p.parentId, kind: 'SUBPROJECT' as const }] : []
    ),
    ...docs.map((d) => ({ source: d.id, target: d.entityId, kind: 'DOC' as const })),
    ...reports.map((r) => ({ source: r.id, target: r.entityId, kind: 'REPORT' as const })),
    ...todos.map((t) => ({ source: t.id, target: t.entityId, kind: 'TODO' as const }))
  ];

  // A node with no edges is a graph of one: leave it out.
  const linked = new Set(edges.flatMap((e) => [e.source, e.target]));
  return { nodes: nodes.filter((n) => linked.has(n.id)), edges };
};

// ----- Operations -----

const OPEN_STATUSES: readonly TodoStatus[] = ['ACTIVE', 'PENDING'];

export const listOpenTodos = async (
  reg: Pick<Registry, 'prisma'>,
  limit = 25
): Promise<Result<readonly TodoSummary[]>> => {
  const todos = await reg.prisma.todo.findMany({
    where: { status: { in: [...OPEN_STATUSES] }, ...notAttachedToArchived(await loadArchivedIds(reg)) },
    orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }, { createdAt: 'desc' }],
    take: limit
  });

  const labels = await Promise.all(
    todos.map((t) => resolveEntityLabel(reg, t.entityType as EntityType, t.entityId))
  );

  return ok(
    todos.map((t, i) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status as TodoStatus,
      priority: t.priority,
      entityType: t.entityType as EntityType,
      entityId: t.entityId,
      entityLabel: labels[i] ?? null,
      entityPath: entityPath(t.entityType as EntityType, t.entityId),
      targetDate: t.targetDate,
      completedAt: t.completedAt,
      createdAt: t.createdAt
    }))
  );
};

export const listRecentUpdates = async (
  reg: Pick<Registry, 'prisma'>,
  limit = 30
): Promise<Result<readonly RecentUpdate[]>> => {
  const recent = { orderBy: { updatedAt: 'desc' as const }, take: limit };
  const p = reg.prisma;
  // Archived entities, and what's attached to them, stay out of the feed.
  const active = { ...recent, where: { archivedAt: null } };
  const attached = notAttachedToArchived(await loadArchivedIds(reg));

  // People and notes about people are left out: the feed is for everything else.
  const titled = { ...active, select: { id: true, title: true, createdAt: true, updatedAt: true } };
  const [teams, departments, projects, goals, pages, docs, notes, reports, todos] = await Promise.all([
    p.team.findMany(active),
    p.department.findMany(active),
    p.project.findMany(active),
    p.goal.findMany(titled),
    p.page.findMany(titled),
    p.doc.findMany({ ...recent, where: attached, select: { id: true, title: true, entityType: true, entityId: true, createdAt: true, updatedAt: true } }),
    p.note.findMany({ ...recent, where: { entityType: { not: 'PERSON' }, ...attached } }),
    p.report.findMany({ ...recent, where: attached, select: { id: true, title: true, entityType: true, entityId: true, createdAt: true, updatedAt: true } }),
    p.todo.findMany({ ...recent, where: attached })
  ]);

  const parentOf = (x: { entityType: string; entityId: string }) => ({
    entityType: x.entityType as EntityType,
    entityId: x.entityId
  });
  const base = (x: { id: string; createdAt: Date; updatedAt: Date }) => ({
    id: x.id,
    createdAt: x.createdAt,
    updatedAt: x.updatedAt
  });

  const merged = mergeUpdates(
    [
      teams.map((x) => ({ ...base(x), kind: 'TEAM' as const, title: x.name, parent: null })),
      departments.map((x) => ({ ...base(x), kind: 'DEPARTMENT' as const, title: x.name, parent: null })),
      projects.map((x) => ({ ...base(x), kind: 'PROJECT' as const, title: x.name, parent: null })),
      goals.map((x) => ({ ...base(x), kind: 'GOAL' as const, title: x.title, parent: null })),
      pages.map((x) => ({ ...base(x), kind: 'PAGE' as const, title: x.title, parent: null })),
      docs.map((x) => ({ ...base(x), kind: 'DOC' as const, title: x.title, parent: parentOf(x) })),
      notes.map((x) => ({ ...base(x), kind: 'NOTE' as const, title: summarizeContent(x.content), parent: parentOf(x) })),
      features.reports ? reports.map((x) => ({ ...base(x), kind: 'REPORT' as const, title: x.title, parent: parentOf(x) })) : [],
      todos.map((x) => ({ ...base(x), kind: 'TODO' as const, title: x.title, parent: parentOf(x) }))
    ],
    limit
  );

  const labels = await Promise.all(
    merged.map((u) => (u.parent ? resolveEntityLabel(reg, u.parent.entityType, u.parent.entityId) : null))
  );

  return ok(
    merged.map((u, i) => ({
      kind: u.kind,
      id: u.id,
      title: u.title,
      parentLabel: labels[i] ?? null,
      href: updateHref(u),
      at: u.updatedAt,
      isNew: Math.abs(u.updatedAt.getTime() - u.createdAt.getTime()) < 1000
    }))
  );
};

export const getRelationGraph = async (
  reg: Pick<Registry, 'prisma'>
): Promise<Result<RelationGraph>> => {
  const p = reg.prisma;
  const projects = await p.project.findMany({ where: { archivedAt: null }, select: { id: true, name: true, parentId: true } });
  if (projects.length === 0) return ok({ nodes: [], edges: [] });

  const onProjects = { where: { entityType: 'PROJECT' }, select: { id: true, title: true, entityId: true } };
  const [docs, reports, todos] = await Promise.all([
    p.doc.findMany(onProjects),
    p.report.findMany(onProjects),
    p.todo.findMany({ ...onProjects, where: { entityType: 'PROJECT', status: { in: [...OPEN_STATUSES] } } })
  ]);
  return ok(buildGraph({ projects, docs, reports: features.reports ? reports : [], todos }));
};
