// Notebooks on disk: a folder per notebook under <data dir>/Notebooks with a
// notebook.json (name, createdAt), and the default notebook in <data dir>/settings.json.
// Raw storage only; validation and messages live in $api/notebook/operations.

import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { settings as appSettings, type ServerSettings } from '$shared/settings/server/index.server';
import { notebookDir, notebooksDir, rootSettingsPath } from '$shared/settings/server/paths';
import type { NotebookInfo } from '$shared/types/notebook';
import { isNotebookId } from './id';

export interface NotebookStore {
  /** Notebooks with a readable notebook.json, by name. */
  readonly list: () => Promise<readonly NotebookInfo[]>;
  /** Throws if the notebook already exists. */
  readonly create: (notebook: NotebookInfo) => Promise<void>;
  readonly rename: (id: string, name: string) => Promise<void>;
  /** The default notebook's id, or null if unset. It may no longer exist. */
  readonly getDefault: () => Promise<string | null>;
  readonly setDefault: (id: string) => Promise<void>;
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readJson = async (path: string): Promise<unknown> => {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
};

/** Write to a temporary file, then rename, so a reader never sees half a file. */
const writeJson = async (path: string, value: unknown): Promise<void> => {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, path);
};

const notebookFile = (s: ServerSettings, id: string): string => join(notebookDir(s, id), 'notebook.json');

const readNotebook = async (s: ServerSettings, id: string): Promise<NotebookInfo | null> => {
  const data = await readJson(notebookFile(s, id));
  if (!isRecord(data) || typeof data['name'] !== 'string') return null;
  return { id, name: data['name'], createdAt: typeof data['createdAt'] === 'string' ? data['createdAt'] : '' };
};

export const createNotebookStore = (s: ServerSettings = appSettings): NotebookStore => ({
  list: async () => {
    const names = await readdir(notebooksDir(s)).catch(() => [] as string[]);
    const found = await Promise.all(names.filter(isNotebookId).map((id) => readNotebook(s, id)));
    return found.filter((n): n is NotebookInfo => n !== null).sort((a, b) => a.name.localeCompare(b.name));
  },

  create: async (notebook) => {
    if (existsSync(notebookFile(s, notebook.id))) throw new Error(`Notebook ${notebook.id} already exists`);
    await mkdir(notebookDir(s, notebook.id), { recursive: true });
    await writeJson(notebookFile(s, notebook.id), { name: notebook.name, createdAt: notebook.createdAt });
  },

  rename: async (id, name) => {
    const current = await readNotebook(s, id);
    if (!current) throw new Error(`Notebook ${id} not found`);
    await writeJson(notebookFile(s, id), { name, createdAt: current.createdAt });
  },

  getDefault: async () => {
    const data = await readJson(rootSettingsPath(s));
    const id = isRecord(data) ? data['defaultNotebook'] : null;
    return isNotebookId(id) ? id : null;
  },

  setDefault: async (id) => {
    const data = await readJson(rootSettingsPath(s));
    await mkdir(s.dataDir, { recursive: true });
    await writeJson(rootSettingsPath(s), { ...(isRecord(data) ? data : {}), defaultNotebook: id });
  }
});
