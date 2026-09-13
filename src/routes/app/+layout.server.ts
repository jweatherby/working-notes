// App-wide chrome data: the default branding icon shown in the nav.

import { getDefaultBranding } from '$api/branding/operations';
import { getRegistry } from '$shared/registry.server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
  const result = await getDefaultBranding(getRegistry());
  return { defaultBrandingIconUrl: result.ok ? result.value?.iconUrl ?? null : null };
};
