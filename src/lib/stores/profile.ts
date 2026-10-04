// The current notebook's profile, from the app layout's data, and what it changes.

import { derived, type Readable } from 'svelte/store';
import { page } from '$app/stores';
import { navLabels, profileFeatures, type NavLabels, type ProfileFeatures } from '$shared/settings/base/profile';
import type { NotebookInfo, NotebookProfile } from '$shared/types/notebook';

export const profile: Readable<NotebookProfile> = derived(
  page,
  ($page) => ($page.data as { notebook?: NotebookInfo }).notebook?.profile ?? 'work'
);

export const profileFlags: Readable<ProfileFeatures> = derived(profile, profileFeatures);

export const labels: Readable<NavLabels> = derived(profile, navLabels);
