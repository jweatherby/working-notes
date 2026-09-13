import type { PageServerLoad } from './$types';
import { trpc } from '$shared/trpc/client';
import { loadEntityAssets } from '$shared/trpc/load-entity-assets';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ fetch, params }) => {
  const client = trpc(fetch);
  const [result, allPersons, assets] = await Promise.all([
    client.team.get.query({ id: params.id }),
    client.person.list.query(),
    loadEntityAssets(client, 'TEAM', params.id)
  ]);
  if (!result.ok) throw error(404, 'Team not found');
  return {
    team: result.value,
    allPersons: allPersons.ok ? allPersons.value : [],
    ...assets
  };
};
