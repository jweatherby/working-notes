import type { PageServerLoad } from './$types';
import { trpc } from '$shared/trpc/client';
import { loadEntityAssets } from '$shared/trpc/load-entity-assets';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ fetch, params }) => {
  const client = trpc(fetch);
  const owner = { ownerType: 'TEAM', ownerId: params.id } as const;
  const [result, allPersons, ownedGoals, ownedProjects, assets] = await Promise.all([
    client.team.get.query({ id: params.id }),
    client.person.list.query(),
    client.goal.list.query(owner),
    client.project.list.query(owner),
    loadEntityAssets(client, 'TEAM', params.id)
  ]);
  if (!result.ok) throw error(404, 'Team not found');
  return {
    team: result.value,
    allPersons: allPersons.ok ? allPersons.value : [],
    ownedGoals: ownedGoals.ok ? ownedGoals.value : [],
    ownedProjects: ownedProjects.ok ? ownedProjects.value : [],
    ...assets
  };
};
