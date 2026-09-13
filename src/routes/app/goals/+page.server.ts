import type { PageServerLoad } from './$types';
import { trpc } from '$shared/trpc/client';
import { loadOwnerOptions } from '$shared/trpc/load-owner-options';

export const load: PageServerLoad = async ({ fetch }) => {
  const client = trpc(fetch);
  const [goals, ownerOptions] = await Promise.all([client.goal.list.query(), loadOwnerOptions(client)]);
  return { goals: goals.ok ? goals.value : [], ownerOptions };
};
