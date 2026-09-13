import type { PageServerLoad } from './$types';
import { trpc } from '$shared/trpc/client';
import { parseArchiveFilter } from '$shared/utils/archive';

export const load: PageServerLoad = async ({ fetch, url }) => {
  const client = trpc(fetch);
  const departments = await client.department.list.query({ archived: parseArchiveFilter(url.searchParams.get('archived')) });
  return { departments };
};
