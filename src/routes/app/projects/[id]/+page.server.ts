import type { PageServerLoad } from './$types';
import { trpc } from '$shared/trpc/client';
import { loadEntityAssets } from '$shared/trpc/load-entity-assets';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ fetch, params }) => {
  const client = trpc(fetch);
  const [result, allProjects, assets] = await Promise.all([
    client.project.get.query({ id: params.id }),
    client.project.list.query(),
    loadEntityAssets(client, 'PROJECT', params.id)
  ]);
  if (!result.ok) throw error(404, 'Project not found');
  return {
    project: result.value,
    allProjects: allProjects.ok ? allProjects.value : [],
    ...assets
  };
};
