import type { PageServerLoad } from './$types';
import { trpc } from '$shared/trpc/client';

export const load: PageServerLoad = async ({ fetch }) => {
  const client = trpc(fetch);
  const projects = await client.project.list.query();
  return { projects };
};
