import type { PageServerLoad } from './$types';
import { trpc } from '$shared/trpc/client';
import { loadOwnerOptions } from '$shared/trpc/load-owner-options';

export const load: PageServerLoad = async ({ fetch }) => {
  const client = trpc(fetch);
  const [projects, ownerOptions] = await Promise.all([client.project.list.query(), loadOwnerOptions(client)]);
  return { projects, ownerOptions };
};
