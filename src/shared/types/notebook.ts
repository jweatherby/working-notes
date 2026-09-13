// A notebook is a separate local database and files folder: work, or a personal project.

export interface NotebookInfo {
  /** Folder name, `--notebook` value and `?notebook=` value. Never changes. */
  readonly id: string;
  readonly name: string;
  /** ISO timestamp. */
  readonly createdAt: string;
}

export interface NotebookSummary extends NotebookInfo {
  /** The notebook this call ran against. */
  readonly isCurrent: boolean;
  /** The notebook the CLI and MCP tools use when none is named. */
  readonly isDefault: boolean;
}
