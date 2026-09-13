import type { PageServerLoad } from './$types';
import { trpc } from '$shared/trpc/client';
import { loadEntityAssets } from '$shared/trpc/load-entity-assets';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ fetch, params }) => {
  const client = trpc(fetch);
  const [result, allPersons, allTeams, allDepartments, assets] = await Promise.all([
    client.person.get.query({ id: params.id }),
    client.person.list.query(),
    client.team.list.query(),
    client.department.list.query(),
    loadEntityAssets(client, 'PERSON', params.id)
  ]);
  if (!result.ok) throw error(404, 'Person not found');
  return {
    person: result.value,
    allPersons: allPersons.ok ? allPersons.value : [],
    allTeams: allTeams.ok ? allTeams.value : [],
    allDepartments: allDepartments.ok ? allDepartments.value : [],
    ...assets
  };
};
