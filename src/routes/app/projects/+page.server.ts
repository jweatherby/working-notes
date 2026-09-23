import type { PageServerLoad } from './$types';
import { trpc } from '$shared/trpc/client';
import { parseArchiveFilter } from '$shared/utils/archive';
import { loadOwnerOptions } from '$shared/trpc/load-owner-options';

export const load: PageServerLoad = async ({ fetch, url }) => {
  const client = trpc(fetch);
  const archived = parseArchiveFilter(url.searchParams.get('archived'));
  // The Map view also needs every dependency and goal link; the table doesn't.
  const [projects, ownerOptions, dependencies] = await Promise.all([
    client.project.list.query({ archived }),
    loadOwnerOptions(client),
    url.searchParams.get('view') === 'map' ? client.project.dependencies.query({ archived }) : null
  ]);
  return { projects, ownerOptions, dependencies: dependencies?.ok ? dependencies.value : null };
};
