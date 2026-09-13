import { writable } from 'svelte/store';

interface LayoutConfig {
  readonly collapseInfoPanel: boolean;
}

export const layoutConfig = writable<LayoutConfig>({ collapseInfoPanel: false });
