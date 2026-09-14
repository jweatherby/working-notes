// What an entity's page can link to: every active person, team, department,
// project, goal and wiki page except the entity itself. Each option's id is
// `TYPE:id` and its scope is the type, for SearchPicker.

import type { CreateTRPCClient } from '@trpc/client';
import type { AppRouter } from './router';
import type { RelatableType } from '$shared/types/enums';
import { typedIdValue } from '$shared/utils/entity';
import type { RelationEnd } from '$shared/utils/relations';

export interface RelationTargetOption {
  readonly id: string;
  readonly name: string;
  readonly scope: RelatableType;
}

export const loadRelationTargets = async (
  client: CreateTRPCClient<AppRouter>,
  self: RelationEnd
): Promise<readonly RelationTargetOption[]> => {
  const [people, teams, departments, projects, goals, pages] = await Promise.all([
    client.person.list.query(),
    client.team.list.query(),
    client.department.list.query(),
    client.project.list.query(),
    client.goal.list.query(),
    client.page.list.query()
  ]);
  const options = (type: RelatableType, rows: readonly { readonly id: string; readonly name: string }[]) =>
    rows
      .filter((row) => !(type === self.entityType && row.id === self.entityId))
      .map((row) => ({ id: typedIdValue(type, row.id), name: row.name, scope: type }));
  const titled = (rows: readonly { readonly id: string; readonly title: string }[]) =>
    rows.map((row) => ({ id: row.id, name: row.title }));
  return [
    ...options('PERSON', people.ok ? people.value : []),
    ...options('TEAM', teams.ok ? teams.value : []),
    ...options('DEPARTMENT', departments.ok ? departments.value : []),
    ...options('PROJECT', projects.ok ? projects.value : []),
    ...options('GOAL', goals.ok ? titled(goals.value) : []),
    ...options('PAGE', pages.ok ? titled(pages.value) : [])
  ];
};
