// The home page's focus graph: one entity and everything one link away, grouped
// by how the link reads from it. Links are relations (including goal–project
// links), ownership, parent/child, reporting lines, team members and
// departments. Attached docs, notes and todos only appear when a relation
// points at them.

import type { Registry } from '$shared/registry';
import { ok, err, type Result } from '$shared/utils';
import type { RelatableType } from '$shared/types/enums';
import { FOCUS_TYPES, type FocusGraph, type FocusGroup, type FocusNode, type FocusType } from '$shared/types/home';
import { entityPath, entityTypeLabel } from '$shared/utils/entity';
import { features } from '$shared/settings/base/features';
import { resolveEntityLabel } from '$api/_entity-labels';
import { loadArchivedIds } from '$api/_archive';
import { listRelationsForEntity } from '$api/relation/operations';

/** One neighbour of the focus, and how the link reads from the focus. */
export interface FocusLink {
  readonly label: string;
  readonly node: FocusNode;
}

/** Groups in reading order; any other label goes after these. */
const GROUP_ORDER: readonly string[] = [
  'Part of',
  'Contains',
  'Reports to',
  'Direct reports',
  'Member of',
  'Members',
  'Department',
  'People',
  'Owned by',
  'Owns',
  'Depends on',
  'Needed by',
  'Related to',
  'Mentions',
  'Mentioned in'
];

const orderOf = (label: string): number => {
  const i = GROUP_ORDER.indexOf(label);
  return i === -1 ? GROUP_ORDER.length : i;
};

export const isFocusType = (type: string): type is FocusType => (FOCUS_TYPES as readonly string[]).includes(type);

export const focusNode = (type: RelatableType, id: string, label: string, href = entityPath(type, id)): FocusNode => ({
  id,
  type,
  label,
  href,
  focusable: isFocusType(type)
});

/**
 * Groups the focus's links by label, in `GROUP_ORDER`, each sorted by name and
 * capped at `cap` (the rest counted in `more`). The same entity under the same
 * label shows once, and the focus itself never shows as its own neighbour.
 */
export const buildFocusGraph = (focus: FocusNode, links: readonly FocusLink[], cap = 8): FocusGraph => {
  const byLabel = new Map<string, Map<string, FocusNode>>();
  for (const { label, node } of links) {
    if (node.type === focus.type && node.id === focus.id) continue;
    const group = byLabel.get(label) ?? new Map<string, FocusNode>();
    group.set(`${node.type}:${node.id}`, node);
    byLabel.set(label, group);
  }
  const groups: FocusGroup[] = [...byLabel.entries()]
    .sort(([a], [b]) => orderOf(a) - orderOf(b) || a.localeCompare(b))
    .map(([label, nodes]) => {
      const sorted = [...nodes.values()].sort((a, b) => a.label.localeCompare(b.label));
      return { label, nodes: sorted.slice(0, cap), more: Math.max(0, sorted.length - cap) };
    });
  return { focus, groups };
};

// ----- Loading -----

interface Named {
  readonly id: string;
  readonly name: string;
}

const links = (label: string, type: RelatableType, rows: readonly Named[]): FocusLink[] =>
  rows.map((r) => ({ label, node: focusNode(type, r.id, r.name) }));

const titled = (rows: readonly { readonly id: string; readonly title: string }[]): Named[] =>
  rows.map((r) => ({ id: r.id, name: r.title }));

const ownerLink = async (
  reg: Pick<Registry, 'prisma'>,
  row: { readonly ownerType: string | null; readonly ownerId: string | null } | null
): Promise<FocusLink[]> => {
  if (!row?.ownerType || !row.ownerId || !isFocusType(row.ownerType)) return [];
  const label = await resolveEntityLabel(reg, row.ownerType, row.ownerId);
  return label === null ? [] : [{ label: 'Owned by', node: focusNode(row.ownerType, row.ownerId, label) }];
};

const ownedLinks = async (reg: Pick<Registry, 'prisma'>, type: FocusType, id: string): Promise<FocusLink[]> => {
  const where = { where: { ownerType: type, ownerId: id } };
  const [projects, goals] = await Promise.all([
    reg.prisma.project.findMany({ ...where, select: { id: true, name: true } }),
    reg.prisma.goal.findMany({ ...where, select: { id: true, title: true } })
  ]);
  return [...links('Owns', 'PROJECT', projects), ...links('Owns', 'GOAL', titled(goals))];
};

/** Links that come from the focus's own columns and join tables, not from relations. */
const structuralLinks = async (reg: Pick<Registry, 'prisma'>, type: FocusType, id: string): Promise<FocusLink[]> => {
  const p = reg.prisma;
  const named = { select: { id: true, name: true } };
  switch (type) {
    case 'PERSON': {
      const person = await p.person.findUnique({
        where: { id },
        select: { lead: named, department: named, teamMemberships: { select: { team: named } } }
      });
      const reports = await p.person.findMany({ where: { leadId: id }, ...named });
      return [
        ...links('Reports to', 'PERSON', person?.lead ? [person.lead] : []),
        ...links('Direct reports', 'PERSON', reports),
        ...links('Member of', 'TEAM', person?.teamMemberships.map((m) => m.team) ?? []),
        ...links('Department', 'DEPARTMENT', person?.department ? [person.department] : []),
        ...(await ownedLinks(reg, type, id))
      ];
    }
    case 'TEAM': {
      const members = await p.teamMember.findMany({ where: { teamId: id }, select: { person: named } });
      return [...links('Members', 'PERSON', members.map((m) => m.person)), ...(await ownedLinks(reg, type, id))];
    }
    case 'DEPARTMENT': {
      const people = await p.person.findMany({ where: { departmentId: id }, ...named });
      return [...links('People', 'PERSON', people), ...(await ownedLinks(reg, type, id))];
    }
    case 'PROJECT': {
      const project = await p.project.findUnique({
        where: { id },
        select: { ownerType: true, ownerId: true, parent: named }
      });
      const children = await p.project.findMany({ where: { parentId: id }, ...named });
      return [
        ...links('Part of', 'PROJECT', project?.parent ? [project.parent] : []),
        ...links('Contains', 'PROJECT', children),
        ...(await ownerLink(reg, project))
      ];
    }
    case 'GOAL': {
      const t = { select: { id: true, title: true } };
      const goal = await p.goal.findUnique({ where: { id }, select: { ownerType: true, ownerId: true, parent: t } });
      const children = await p.goal.findMany({ where: { parentId: id }, ...t });
      return [
        ...links('Part of', 'GOAL', goal?.parent ? titled([goal.parent]) : []),
        ...links('Contains', 'GOAL', titled(children)),
        ...(await ownerLink(reg, goal))
      ];
    }
    case 'PAGE': {
      const t = { select: { id: true, title: true } };
      const page = await p.page.findUnique({ where: { id }, select: { parent: t } });
      const children = await p.page.findMany({ where: { parentId: id }, ...t });
      return [
        ...links('Part of', 'PAGE', page?.parent ? titled([page.parent]) : []),
        ...links('Contains', 'PAGE', titled(children))
      ];
    }
  }
};

/** The most recently updated active project, goal or team. */
const defaultFocus = async (
  reg: Pick<Registry, 'prisma'>
): Promise<{ readonly type: FocusType; readonly id: string } | null> => {
  const latest = { where: { archivedAt: null }, orderBy: { updatedAt: 'desc' as const }, select: { id: true, updatedAt: true } };
  const [project, goal, team] = await Promise.all([
    reg.prisma.project.findFirst(latest),
    reg.prisma.goal.findFirst(latest),
    reg.prisma.team.findFirst(latest)
  ]);
  const candidates = [
    project && { type: 'PROJECT' as const, ...project },
    goal && { type: 'GOAL' as const, ...goal },
    team && { type: 'TEAM' as const, ...team }
  ].filter((c) => c !== null);
  const newest = candidates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
  return newest ? { type: newest.type, id: newest.id } : null;
};

export const getFocusGraph = async (
  reg: Pick<Registry, 'prisma'>,
  requested?: { readonly type: FocusType; readonly id: string }
): Promise<Result<FocusGraph>> => {
  const target = requested ?? (await defaultFocus(reg));
  if (!target) return ok({ focus: null, groups: [] });

  const label = await resolveEntityLabel(reg, target.type, target.id);
  if (label === null) {
    return err(new Error(`No ${entityTypeLabel(target.type).toLowerCase()} with id ${target.id}. Find ids with ${target.type.toLowerCase()}.list.`));
  }

  const [relations, structural, archived] = await Promise.all([
    listRelationsForEntity(reg, target.type, target.id),
    structuralLinks(reg, target.type, target.id),
    loadArchivedIds(reg)
  ]);
  if (!relations.ok) return relations;

  const relationLinks: FocusLink[] = relations.value.flatMap((group) =>
    group.items.map((item) => ({
      label: item.label,
      node: focusNode(item.other.entityType, item.other.entityId, item.other.label ?? '(untitled)', item.other.path)
    }))
  );

  const isArchived = (node: FocusNode): boolean =>
    isFocusType(node.type) && (archived.get(node.type) ?? []).includes(node.id);
  const visible = [...structural, ...relationLinks].filter(
    ({ node }) => !isArchived(node) && (features.reports || node.type !== 'REPORT')
  );

  return ok(buildFocusGraph(focusNode(target.type, target.id, label), visible));
};
