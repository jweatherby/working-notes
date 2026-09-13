import type { PageServerLoad } from './$types';
import { trpc } from '$shared/trpc/client';
import { parseArchiveFilter } from '$shared/utils/archive';

export const load: PageServerLoad = async ({ fetch, url }) => {
  const client = trpc(fetch);
  const persons = await client.person.list.query({ archived: parseArchiveFilter(url.searchParams.get('archived')) });
  return { persons };
};
