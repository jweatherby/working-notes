import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { profileFeatures } from '$shared/settings/base/profile';
import { trpc } from '$shared/trpc/client';
import { parseArchiveFilter } from '$shared/utils/archive';

export const load: PageServerLoad = async ({ fetch, url, locals }) => {
  // Hidden in a home notebook; its departments, if any, stay reachable by link.
  if (!profileFeatures(locals.notebook.profile).departments) redirect(307, '/app/people');
  const client = trpc(fetch);
  const departments = await client.department.list.query({ archived: parseArchiveFilter(url.searchParams.get('archived')) });
  return { departments };
};
