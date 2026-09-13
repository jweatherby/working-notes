import type { PageServerLoad } from './$types';
import { trpc } from '$shared/trpc/client';

export const load: PageServerLoad = async ({ fetch }) => {
  const result = await trpc(fetch).report.list.query();
  return { reports: result.ok ? result.value : [] };
};
