import { writable } from 'svelte/store';

interface Note {
  readonly id: string;
  readonly parentId: string | null;
  readonly content: string;
  readonly createdAt: Date | string;
  readonly replies: readonly Note[];
}

export interface RightPanelNotes {
  readonly notes: readonly Note[];
  readonly onAdd: (content: string, parentId?: string) => Promise<void>;
  readonly onRemove: (id: string) => Promise<void>;
  readonly onStartAdd?: (parentId?: string) => void;
  readonly onEdit?: (noteId: string) => void;
}

export type RightPanelTabId = 'notes';

export const rightPanelNotes = writable<RightPanelNotes | null>(null);
export const rightPanelTab = writable<RightPanelTabId>('notes');

export type ActiveDrawer = 'left' | 'right' | null;
export const activeDrawer = writable<ActiveDrawer>(null);
