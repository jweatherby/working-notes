import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { trpc } from '$shared/trpc/client';
import { resolvePrintOptions } from '$lib/doc/print-options';

export const load: PageServerLoad = async ({ params, url, fetch }) => {
  const client = trpc(fetch);
  const [page, brandings] = await Promise.all([
    client.page.get.query({ id: params.id }),
    client.branding.list.query()
  ]);
  if (!page.ok) error(404, 'Page not found');
  const brandingList = brandings.ok ? brandings.value : [];
  const options = resolvePrintOptions(url.searchParams, brandingList);
  const branding = options.brandingId ? await client.branding.get.query({ id: options.brandingId }) : null;
  return {
    page: page.value,
    brandings: brandingList,
    options,
    branding: branding?.ok ? branding.value : null
  };
};
