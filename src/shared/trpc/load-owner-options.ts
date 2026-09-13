// Owner choices (departments, teams, people) for goal and project owner
// pickers. Each option's id is `TYPE:id`, so one <select> can hold all three.

import type { CreateTRPCClient } from '@trpc/client';
import type { AppRouter } from './router';
import { OWNER_TYPES, type OwnerType } from '$shared/types/enums';

export interface OwnerOption {
  readonly id: string;
  readonly name: string;
  readonly group: string;
}

export const ownerOptionValue = (ownerType: OwnerType, ownerId: string): string => `${ownerType}:${ownerId}`;

export const parseOwnerOptionValue = (
  value: string
): { readonly ownerType: OwnerType; readonly ownerId: string } | null => {
  const at = value.indexOf(':');
  const ownerType = value.slice(0, at) as OwnerType;
  const ownerId = value.slice(at + 1);
  return at > 0 && ownerId && OWNER_TYPES.includes(ownerType) ? { ownerType, ownerId } : null;
};

export const loadOwnerOptions = async (client: CreateTRPCClient<AppRouter>): Promise<readonly OwnerOption[]> => {
  const [departments, teams, people] = await Promise.all([
    client.department.list.query(),
    client.team.list.query(),
    client.person.list.query()
  ]);
  const options = (group: string, ownerType: OwnerType, rows: readonly { readonly id: string; readonly name: string }[]) =>
    rows.map((row) => ({ id: ownerOptionValue(ownerType, row.id), name: row.name, group }));
  return [
    ...options('Departments', 'DEPARTMENT', departments.ok ? departments.value : []),
    ...options('Teams', 'TEAM', teams.ok ? teams.value : []),
    ...options('People', 'PERSON', people.ok ? people.value : [])
  ];
};
