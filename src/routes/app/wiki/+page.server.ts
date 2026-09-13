import type { PageServerLoad } from './$types';
import { trpc } from '$shared/trpc/client';
import { parseArchiveFilter } from '$shared/utils/archive';

export const load: PageServerLoad = async ({ fetch, url }) => {
  const pages = await trpc(fetch).page.list.query({ archived: parseArchiveFilter(url.searchParams.get('archived')) });
  return { pages: pages.ok ? pages.value : [] };
};
