import type { PageServerLoad } from './$types';
import { trpc } from '$shared/trpc/client';

export const load: PageServerLoad = async ({ fetch }) => {
  const pages = await trpc(fetch).page.list.query();
  return { pages: pages.ok ? pages.value : [] };
};
